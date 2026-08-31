import { createServer } from 'http'
import { Server } from 'socket.io'
import { PrismaClient } from '@prisma/client'

// ── Prisma ──
const db = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL || undefined,
  log: process.env.NODE_ENV === 'development' ? ['error'] : [],
})

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
  const where: Record<string, unknown> = { tenantId, read: false }
  if (userId) where.userId = userId
  return db.notification.count({ where })
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
  return db.portalNotification.count({ where: { portalId, read: false } })
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

  const notification = await db.notification.create({
    data: {
      title: title as string,
      message: message as string,
      category,
      resourceType: (resourceType as string) || null,
      resourceId: (resourceId as string) || null,
      tenantId: tenantId as string,
      userId: (userId as string) || null,
    },
  })

  const payload = {
    id: notification.id,
    type: type as string || null,
    title: notification.title,
    message: notification.message,
    resourceType: notification.resourceType,
    resourceId: notification.resourceId,
    category,
    createdAt: notification.createdAt,
  }

  for (const [socketId, info] of socketMap.entries()) {
    if (info.tenantId === tenantId && info.type === 'user') {
      if (!userId || info.userId === userId) {
        io.to(socketId).emit('notification', payload)
      }
    }
  }

  await broadcastUnreadCount(tenantId as string)
  return { status: 200, body: { ok: true, id: notification.id } }
}

// ── Portal notification logic ──
async function handleNotifyPortal(body: Record<string, unknown>) {
  const { portalId, tenantId, title, message, category, resourceType, resourceId } = body
  if (!portalId || !tenantId || !title || !message) {
    return { status: 400, body: { error: 'portalId, tenantId, title, message requis' } }
  }

  const portalNotification = await db.portalNotification.create({
    data: {
      title: title as string,
      message: message as string,
      category: (category as string) || 'dossier',
      resourceType: (resourceType as string) || null,
      resourceId: (resourceId as string) || null,
      portalId: portalId as string,
      tenantId: tenantId as string,
    },
  })

  const payload = {
    id: portalNotification.id,
    title: portalNotification.title,
    message: portalNotification.message,
    category: portalNotification.category,
    resourceType: portalNotification.resourceType,
    resourceId: portalNotification.resourceId,
    createdAt: portalNotification.createdAt,
  }

  // Broadcast to all portal sockets matching this portalId + tenantId
  for (const [socketId, info] of socketMap.entries()) {
    if (info.type === 'portal' && info.portalId === portalId && info.tenantId === tenantId) {
      io.to(socketId).emit('portal-notification', payload)
    }
  }

  await broadcastPortalUnreadCount(portalId as string)
  return { status: 200, body: { ok: true, id: portalNotification.id } }
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

      const user = await db.user.findUnique({
        where: { id: userId },
        select: { id: true, tenantId: true, isActive: true },
      })

      if (!user || !user.isActive) {
        socket.emit('auth-error', { message: 'Utilisateur introuvable ou inactif' })
        return
      }

      if (user.tenantId !== tenantId && user.tenantId !== null) {
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

      const portal = await db.clientPortal.findUnique({
        where: { id: portalId },
        select: { id: true, tenantId: true, clientId: true, isActive: true },
      })

      if (!portal || !portal.isActive) {
        socket.emit('portal-auth-error', { message: 'Portal introuvable ou inactif' })
        return
      }

      if (portal.tenantId !== tenantId) {
        socket.emit('portal-auth-error', { message: 'Cabinet non correspondant' })
        return
      }

      socketMap.set(socket.id, {
        type: 'portal',
        portalId: portal.id,
        tenantId: portal.tenantId,
        clientId: portal.clientId,
      })

      const unreadCount = await getPortalUnreadCount(portalId)
      socket.emit('portal-unread-count', unreadCount)

      console.log(`[notif-service] Portal ${portalId} authenticated (tenant: ${tenantId}, client: ${portal.clientId}), unread: ${unreadCount}`)
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

      await db.notification.updateMany({
        where: { id: notificationId, tenantId: info.tenantId, userId: info.userId },
        data: { read: true },
      })

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

      await db.portalNotification.updateMany({
        where: { id: notificationId, portalId: info.portalId, tenantId: info.tenantId },
        data: { read: true },
      })

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
    await db.$disconnect().catch(() => {})
    console.log('[notif-service] Servers closed')
    process.exit(0)
  })
}
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
