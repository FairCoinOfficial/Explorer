// Custom Server with WebSocket Support for FairCoin Explorer
const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { WebSocketServer } = require('ws')

const dev = process.env.NODE_ENV !== 'production'
const hostname = process.env.HOST || '0.0.0.0'
const port = parseInt(process.env.PORT || '3000', 10)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

// Import WebSocket handler (will be created)
let wsHandler

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error handling request:', err)
      res.statusCode = 500
      res.end('Internal server error')
    }
  })

  // Create WebSocket server
  const wss = new WebSocketServer({ noServer: true })

  // Handle WebSocket upgrade
  server.on('upgrade', (request, socket, head) => {
    const { pathname } = parse(request.url, true)

    // Only handle /api/ws path
    if (pathname === '/api/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request)
      })
    } else {
      socket.destroy()
    }
  })

  // WebSocket connection handler
  let wsHandlerFailed = false
  wss.on('connection', (ws, request) => {
    // Lazy load handler to avoid import issues during build
    if (!wsHandler && !wsHandlerFailed) {
      try {
        wsHandler = require('./lib/websocket-handler')
      } catch (error) {
        console.error('WebSocket handler not available (TypeScript module not compiled):', error.message)
        wsHandlerFailed = true
      }
    }

    if (!wsHandler) {
      ws.close()
      return
    }

    try {
      const ip = request.headers['x-forwarded-for'] || request.socket.remoteAddress
      wsHandler.handleConnection(ws, request, ip)
    } catch (error) {
      console.error('Error handling WebSocket connection:', error)
      ws.close()
    }
  })

  server.listen(port, hostname, (err) => {
    if (err) throw err
    console.log(`> Ready on http://${hostname}:${port}`)
    console.log(`> WebSocket server ready on ws://${hostname}:${port}/api/ws`)
  })
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server')
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server')
  process.exit(0)
})
