import { createServer } from 'http'
import { Server } from 'socket.io'
import { PrismaClient } from '@prisma/client'

// ── Prisma ──
const db = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL || undefined,
  log: process.env.NODE_ENV === 'development' ? ['error'] : [],
})

// ── In-memory socket → user/tenant mapping ──
interface SocketUser {
  userId: string
  tenantId: string
}
const socketUserMap = new Map<string, SocketUser>()

// ── Helpers ──
async function getUnreadCount(tenantId: string, userId?: string) {
  const where: Record<string, unknown> = { tenantId, read: false }
  if (userId) where.userId = userId
  return db.notification.count({ where })
}

async function broadcastUnreadCount(tenantId: string) {
  for (const [socketId, info] of socketUserMap.entries()) {
    if (info.tenantId === tenantId) {
      const count = await getUnreadCount(tenantId, info.userId)
      io.to(socketId).emit('unread-count', count)
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

// ── Shared notification logic ──
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

  for (const [socketId, info] of socketUserMap.entries()) {
    if (info.tenantId === tenantId) {
      if (!userId || info.userId === userId) {
        io.to(socketId).emit('notification', payload)
      }
    }
  }

  await broadcastUnreadCount(tenantId)
  return { status: 200, body: { ok: true, id: notification.id } }
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

      socketUserMap.set(socket.id, { userId, tenantId })

      const unreadCount = await getUnreadCount(tenantId, userId)
      socket.emit('unread-count', unreadCount)

      console.log(`[notif-service] User ${userId} authenticated (tenant: ${tenantId}), unread: ${unreadCount}`)
    } catch (err) {
      console.error('[notif-service] Auth error:', err)
      socket.emit('auth-error', { message: "Erreur d'authentification" })
    }
  })

  socket.on('mark-read', async (notificationId: string) => {
    try {
      const info = socketUserMap.get(socket.id)
      if (!info) return

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

  socket.on('disconnect', () => {
    const info = socketUserMap.get(socket.id)
    if (info) {
      console.log(`[notif-service] User ${info.userId} disconnected from tenant ${info.tenantId}`)
    }
    socketUserMap.delete(socket.id)
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
