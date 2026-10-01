import { createServer } from 'http'
import { Server } from 'socket.io'
import pg from 'pg'

// ── Database adapter (pg-based, replaces Prisma) ──
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
})

pool.on('error', (err) => {
  console.error('[notif-service] Unexpected pool error:', err)
})

/** Simple query helper */
async function query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  const { rows } = await pool.query(sql, params)
  return rows as T[]
}

/** Single row helper */
async function queryOne<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T | null> {
  const rows = await query<T>(sql, params)
  return rows[0] || null
}

// ── In-memory socket → user/portal mapping ──
interface SocketUserEntry {
  type: 'user'
  userId: string
  tenantId: string
}

interface SocketPortalEntry {
  type: 'portal'
  portalId: string
  tenantId: string
  clientId: string
}

type SocketEntry = SocketUserEntry | SocketPortalEntry

const socketMap = new Map<string, SocketEntry>()

// ── Helpers: user notifications ──
async function getUnreadCount(tenantId: string, userId?: string) {
  const sql = userId
    ? 'SELECT count(*)::int AS cnt FROM notifications WHERE tenant_id = $1 AND user_id = $2 AND read = false'
    : 'SELECT count(*)::int AS cnt FROM notifications WHERE tenant_id = $1 AND read = false'
  const params = userId ? [tenantId, userId] : [tenantId]
  const row = await queryOne<{ cnt: number }>(sql, params)
  return row?.cnt ?? 0
}

async function broadcastUnreadCount(tenantId: string) {
  for (const [socketId, info] of socketMap.entries()) {
    if (info.tenantId === tenantId && info.type === 'user') {
      const count = await getUnreadCount(tenantId, info.userId)
      io.to(socketId).emit('unread-count', count)
    }
  }
}

// ── Helpers: portal notifications ──
async function getPortalUnreadCount(portalId: string) {
  const row = await queryOne<{ cnt: number }>(
    'SELECT count(*)::int AS cnt FROM portal_notifications WHERE portal_id = $1 AND read = false',
    [portalId],
  )
  return row?.cnt ?? 0
}

async function broadcastPortalUnreadCount(portalId: string) {
  for (const [socketId, info] of socketMap.entries()) {
    if (info.type === 'portal' && info.portalId === portalId) {
      const count = await getPortalUnreadCount(portalId)
      io.to(socketId).emit('portal-unread-count', count)
    }
  }
}

// ── JSON body parser ──
function readBody(req: import('http').IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (c: Buffer) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks).toString()))
    req.on('error', reject)
  })
}

// ── Shared notification logic (User) ──
async function handleNotify(body: Record<string, unknown>) {
  const { tenantId, type, title, message, resourceType, resourceId, userId } = body
  if (!tenantId || !title || !message) {
    return { status: 400, body: { error: 'tenantId, title, message requis' } }
  }

  const category = (type as string) || 'dossier'

  const rows = await query<{ id: string; created_at: string }>(
    `INSERT INTO notifications (title, message, category, resource_type, resource_id, tenant_id, user_id, read)
     VALUES ($1, $2, $3, $4, $5, $6, $7, false)
     RETURNING id, created_at`,
    [
      title as string,
      message as string,
      category,
      (resourceType as string) || null,
      (resourceId as string) || null,
      tenantId as string,
      (userId as string) || null,
    ],
  )
  const notification = rows[0]

  const payload = {
    id: notification?.id,
    type: (type as string) || null,
    title: title as string,
    message: message as string,
    resourceType: (resourceType as string) || null,
    resourceId: (resourceId as string) || null,
    category,
    createdAt: notification?.created_at,
  }

  for (const [socketId, info] of socketMap.entries()) {
    if (info.tenantId === tenantId && info.type === 'user') {
      if (!userId || info.userId === userId) {
        io.to(socketId).emit('notification', payload)
      }
    }
  }

  await broadcastUnreadCount(tenantId as string)
  return { status: 200, body: { ok: true, id: notification?.id } }
}

// ── Portal notification logic ──
async function handleNotifyPortal(body: Record<string, unknown>) {
  const { portalId, tenantId, title, message, category, resourceType, resourceId } = body
  if (!portalId || !tenantId || !title || !message) {
    return { status: 400, body: { error: 'portalId, tenantId, title, message requis' } }
  }

  const rows = await query<{ id: string; created_at: string }>(
    `INSERT INTO portal_notifications (title, message, category, resource_type, resource_id, portal_id, tenant_id, read)
     VALUES ($1, $2, $3, $4, $5, $6, $7, false)
     RETURNING id, created_at`,
    [
      title as string,
      message as string,
      (category as string) || 'dossier',
      (resourceType as string) || null,
      (resourceId as string) || null,
      portalId as string,
      tenantId as string,
    ],
  )
  const portalNotification = rows[0]

  const payload = {
    id: portalNotification?.id,
    title: title as string,
    message: message as string,
    category: (category as string) || 'dossier',
    resourceType: (resourceType as string) || null,
    resourceId: (resourceId as string) || null,
    createdAt: portalNotification?.created_at,
  }

  // Broadcast to all portal sockets matching this portalId + tenantId
  for (const [socketId, info] of socketMap.entries()) {
    if (info.type === 'portal' && info.portalId === portalId && info.tenantId === tenantId) {
      io.to(socketId).emit('portal-notification', payload)
    }
  }

  await broadcastPortalUnreadCount(portalId as string)
  return { status: 200, body: { ok: true, id: portalNotification?.id } }
}

// ════════════════════════════════════════════════════════
// Internal HTTP API server (port 3005) — for server-side triggers
// ════════════════════════════════════════════════════════
const apiServer = createServer(async (req, res) => {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Method not allowed' }))
    return
  }

  try {
    const raw = await readBody(req)
    const body = JSON.parse(raw)
    const url = req.url || ''

    let result: { status: number; body: Record<string, unknown> }
    if (url === '/notify') {
      result = await handleNotify(body)
    } else if (url === '/notify-user') {
      if (!body.userId) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'userId requis' }))
        return
      }
      result = await handleNotify(body)
    } else if (url === '/notify-portal') {
      result = await handleNotifyPortal(body)
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Not found' }))
      return
    }

    res.writeHead(result.status, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(result.body))
  } catch (err) {
    console.error('[notif-service] API error:', err)
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Internal server error' }))
  }
})

const API_PORT = 3005
apiServer.listen(API_PORT, () => {
  console.log(`[notif-service] Internal HTTP API on port ${API_PORT}`)
})

// ════════════════════════════════════════════════════════
// Socket.io server (port 3004) — for real-time client connections
// ════════════════════════════════════════════════════════
const wsServer = createServer()
const io = new Server(wsServer, {
  path: '/',
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
})

io.on('connection', (socket) => {
  console.log(`[notif-service] Socket connected: ${socket.id}`)

  // ── User auth (existing) ──
  socket.on('auth', async (data: { userId: string; tenantId: string }) => {
    try {
      const { userId, tenantId } = data
      if (!userId || !tenantId) {
        socket.emit('auth-error', { message: 'userId et tenantId requis' })
        return
      }

      const user = await queryOne<{ id: string; tenant_id: string; is_active: boolean }>(
        'SELECT id, tenant_id, is_active FROM users WHERE id = $1',
        [userId],
      )

      if (!user || !user.is_active) {
        socket.emit('auth-error', { message: 'Utilisateur introuvable ou inactif' })
        return
      }

      if (user.tenant_id !== tenantId && user.tenant_id !== null) {
        socket.emit('auth-error', { message: 'Cabinet non correspondant' })
        return
      }

      socketMap.set(socket.id, { type: 'user', userId, tenantId })

      const unreadCount = await getUnreadCount(tenantId, userId)
      socket.emit('unread-count', unreadCount)

      console.log(`[notif-service] User ${userId} authenticated (tenant: ${tenantId}), unread: ${unreadCount}`)
    } catch (err) {
      console.error('[notif-service] Auth error:', err)
      socket.emit('auth-error', { message: "Erreur d'authentification" })
    }
  })

  // ── Portal auth (new) ──
  socket.on('portal-auth', async (data: { portalId: string; tenantId: string }) => {
    try {
      const { portalId, tenantId } = data
      if (!portalId || !tenantId) {
        socket.emit('portal-auth-error', { message: 'portalId et tenantId requis' })
        return
      }

      const portal = await queryOne<{ id: string; tenant_id: string; client_id: string; is_active: boolean }>(
        'SELECT id, tenant_id, client_id, is_active FROM client_portals WHERE id = $1',
        [portalId],
      )

      if (!portal || !portal.is_active) {
        socket.emit('portal-auth-error', { message: 'Portal introuvable ou inactif' })
        return
      }

      if (portal.tenant_id !== tenantId) {
        socket.emit('portal-auth-error', { message: 'Cabinet non correspondant' })
        return
      }

      socketMap.set(socket.id, {
        type: 'portal',
        portalId: portal.id,
        tenantId: portal.tenant_id,
        clientId: portal.client_id,
      })

      const unreadCount = await getPortalUnreadCount(portalId)
      socket.emit('portal-unread-count', unreadCount)

      console.log(`[notif-service] Portal ${portalId} authenticated (tenant: ${tenantId}, client: ${portal.client_id}), unread: ${unreadCount}`)
    } catch (err) {
      console.error('[notif-service] Portal auth error:', err)
      socket.emit('portal-auth-error', { message: "Erreur d'authentification portal" })
    }
  })

  // ── User mark-read (existing) ──
  socket.on('mark-read', async (notificationId: string) => {
    try {
      const info = socketMap.get(socket.id)
      if (!info || info.type !== 'user') return

      await pool.query(
        'UPDATE notifications SET read = true WHERE id = $1 AND tenant_id = $2 AND user_id = $3',
        [notificationId, info.tenantId, info.userId],
      )

      const unreadCount = await getUnreadCount(info.tenantId, info.userId)
      socket.emit('unread-count', unreadCount)
    } catch (err) {
      console.error('[notif-service] Mark-read error:', err)
    }
  })

  // ── Portal mark-read (new) ──
  socket.on('portal-mark-read', async (notificationId: string) => {
    try {
      const info = socketMap.get(socket.id)
      if (!info || info.type !== 'portal') return

      await pool.query(
        'UPDATE portal_notifications SET read = true WHERE id = $1 AND portal_id = $2 AND tenant_id = $3',
        [notificationId, info.portalId, info.tenantId],
      )

      const unreadCount = await getPortalUnreadCount(info.portalId)
      socket.emit('portal-unread-count', unreadCount)
    } catch (err) {
      console.error('[notif-service] Portal mark-read error:', err)
    }
  })

  // ── Portal unread-count request (new) ──
  socket.on('portal-unread-count', async () => {
    try {
      const info = socketMap.get(socket.id)
      if (!info || info.type !== 'portal') return

      const count = await getPortalUnreadCount(info.portalId)
      socket.emit('portal-unread-count', count)
    } catch (err) {
      console.error('[notif-service] Portal unread-count error:', err)
    }
  })

  // ── Disconnect (handles both user + portal) ──
  socket.on('disconnect', () => {
    const info = socketMap.get(socket.id)
    if (info) {
      if (info.type === 'user') {
        console.log(`[notif-service] User ${info.userId} disconnected from tenant ${info.tenantId}`)
      } else {
        console.log(`[notif-service] Portal ${info.portalId} disconnected from tenant ${info.tenantId}`)
      }
    }
    socketMap.delete(socket.id)
  })

  socket.on('error', (err) => {
    console.error(`[notif-service] Socket error (${socket.id}):`, err)
  })
})

const WS_PORT = 3004
wsServer.listen(WS_PORT, () => {
  console.log(`[notif-service] WebSocket server on port ${WS_PORT}`)
})

// ── Graceful shutdown ──
const shutdown = (signal: string) => {
  console.log(`[notif-service] Received ${signal}, shutting down...`)
  apiServer.close(() => {})
  wsServer.close(async () => {
    await pool.end().catch(() => {})
    console.log('[notif-service] Servers closed')
    process.exit(0)
  })
}
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
