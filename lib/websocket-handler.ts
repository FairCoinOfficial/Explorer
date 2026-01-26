// WebSocket Connection Handler for FairCoin Explorer

import { WebSocket } from 'ws'
import { getWebSocketManager, shutdownWebSocketManager } from './websocket-manager'
import { getBlockchainMonitor, shutdownBlockchainMonitor } from './blockchain-monitor'
import {
  NetworkType,
  ClientMessage,
  WebSocketEvent,
  PongEvent,
  ErrorEvent,
  SubscribeEvent,
  UnsubscribeEvent
} from './websocket-types'

// Initialize WebSocket manager and blockchain monitor
const wsManager = getWebSocketManager({
  maxConnectionsPerIP: parseInt(process.env.WEBSOCKET_MAX_CONNECTIONS_PER_IP || '5'),
  heartbeatInterval: parseInt(process.env.WEBSOCKET_HEARTBEAT_INTERVAL || '30000'),
  connectionTimeout: 300000 // 5 minutes
})

const blockchainMonitor = getBlockchainMonitor(wsManager, {
  pollInterval: parseInt(process.env.BLOCKCHAIN_POLL_INTERVAL || '10000'),
  networks: ['mainnet', 'testnet'],
  enabled: process.env.WEBSOCKET_ENABLED !== 'false'
})

// Start blockchain monitor
let monitorStarted = false
if (!monitorStarted) {
  blockchainMonitor.start().then(() => {
    console.log('[WebSocketHandler] Blockchain monitor started')
    monitorStarted = true
  }).catch(error => {
    console.error('[WebSocketHandler] Failed to start blockchain monitor:', error)
  })
}

/**
 * Handle new WebSocket connection
 */
export function handleConnection(ws: WebSocket, request: any, ip?: string): void {
  let connectionId: string | null = null
  let currentNetwork: NetworkType = 'mainnet'

  try {
    // Register connection
    connectionId = wsManager.register(ws, currentNetwork, ip)

    console.log(`[WebSocketHandler] New connection: ${connectionId} from ${ip || 'unknown'}`)

    // Send welcome message
    const welcomeEvent: WebSocketEvent = {
      type: 'ping',
      network: currentNetwork,
      timestamp: Date.now()
    }
    ws.send(JSON.stringify(welcomeEvent))

    // Handle incoming messages
    ws.on('message', (data: Buffer) => {
      try {
        const message: ClientMessage = JSON.parse(data.toString())
        handleMessage(ws, connectionId!, message)
      } catch (error) {
        console.error(`[WebSocketHandler] Error parsing message from ${connectionId}:`, error)
        sendError(ws, currentNetwork, 'PARSE_ERROR', 'Invalid message format')
      }
    })

    // Handle pong (response to ping)
    ws.on('pong', () => {
      if (connectionId) {
        wsManager.updateActivity(connectionId)
      }
    })

    // Handle connection close
    ws.on('close', (code: number, reason: Buffer) => {
      console.log(`[WebSocketHandler] Connection closed: ${connectionId} (${code}: ${reason.toString()})`)
      if (connectionId) {
        wsManager.unregister(connectionId)
      }
    })

    // Handle errors
    ws.on('error', (error: Error) => {
      console.error(`[WebSocketHandler] WebSocket error for ${connectionId}:`, error)
    })

    // Start heartbeat
    startHeartbeat(ws, connectionId)

  } catch (error) {
    console.error('[WebSocketHandler] Error in handleConnection:', error)
    if (error instanceof Error && error.message.includes('Connection limit exceeded')) {
      sendError(ws, 'mainnet', 'RATE_LIMIT', 'Too many connections from your IP')
    }
    ws.close()
  }
}

/**
 * Handle client message
 */
function handleMessage(ws: WebSocket, connectionId: string, message: ClientMessage): void {
  wsManager.updateActivity(connectionId)

  switch (message.type) {
    case 'ping':
      handlePing(ws, connectionId, message.network || 'mainnet')
      break

    case 'subscribe':
      handleSubscribe(ws, connectionId, message)
      break

    case 'unsubscribe':
      handleUnsubscribe(ws, connectionId, message)
      break

    case 'change-network':
      handleChangeNetwork(ws, connectionId, message.network || 'mainnet')
      break

    default:
      sendError(ws, message.network || 'mainnet', 'UNKNOWN_MESSAGE_TYPE', `Unknown message type: ${message.type}`)
  }
}

/**
 * Handle ping message
 */
function handlePing(ws: WebSocket, connectionId: string, network: NetworkType): void {
  const pongEvent: PongEvent = {
    type: 'pong',
    network,
    timestamp: Date.now(),
    data: {
      latency: 0 // Client can calculate latency
    }
  }
  ws.send(JSON.stringify(pongEvent))
}

/**
 * Handle subscribe message
 */
function handleSubscribe(ws: WebSocket, connectionId: string, message: ClientMessage): void {
  if (message.events && message.events.length > 0) {
    const success = wsManager.subscribe(connectionId, message.events)
    if (success) {
      const subscribeEvent: SubscribeEvent = {
        type: 'subscribe',
        network: message.network || 'mainnet',
        timestamp: Date.now(),
        data: {
          events: message.events
        }
      }
      ws.send(JSON.stringify(subscribeEvent))
    } else {
      sendError(ws, message.network || 'mainnet', 'SUBSCRIBE_FAILED', 'Failed to subscribe to events')
    }
  }
}

/**
 * Handle unsubscribe message
 */
function handleUnsubscribe(ws: WebSocket, connectionId: string, message: ClientMessage): void {
  if (message.events && message.events.length > 0) {
    const success = wsManager.unsubscribe(connectionId, message.events)
    if (success) {
      const unsubscribeEvent: UnsubscribeEvent = {
        type: 'unsubscribe',
        network: message.network || 'mainnet',
        timestamp: Date.now(),
        data: {
          events: message.events
        }
      }
      ws.send(JSON.stringify(unsubscribeEvent))
    }
  }
}

/**
 * Handle network change
 */
function handleChangeNetwork(ws: WebSocket, connectionId: string, newNetwork: NetworkType): void {
  const success = wsManager.changeNetwork(connectionId, newNetwork)
  if (success) {
    const event: WebSocketEvent = {
      type: 'ping',
      network: newNetwork,
      timestamp: Date.now()
    }
    ws.send(JSON.stringify(event))
  } else {
    sendError(ws, newNetwork, 'NETWORK_CHANGE_FAILED', 'Failed to change network')
  }
}

/**
 * Send error to client
 */
function sendError(ws: WebSocket, network: NetworkType, code: string, message: string): void {
  const errorEvent: ErrorEvent = {
    type: 'error',
    network,
    timestamp: Date.now(),
    data: {
      code,
      message
    }
  }
  try {
    ws.send(JSON.stringify(errorEvent))
  } catch (error) {
    console.error('[WebSocketHandler] Error sending error message:', error)
  }
}

/**
 * Start heartbeat (ping) interval
 */
function startHeartbeat(ws: WebSocket, connectionId: string): void {
  const interval = parseInt(process.env.WEBSOCKET_HEARTBEAT_INTERVAL || '30000')

  const heartbeat = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.ping()
      } catch (error) {
        console.error(`[WebSocketHandler] Error sending ping to ${connectionId}:`, error)
        clearInterval(heartbeat)
      }
    } else {
      clearInterval(heartbeat)
    }
  }, interval)

  // Clear interval when connection closes
  ws.on('close', () => {
    clearInterval(heartbeat)
  })
}

/**
 * Shutdown handler
 */
export function shutdown(): void {
  console.log('[WebSocketHandler] Shutting down...')
  shutdownBlockchainMonitor()
  shutdownWebSocketManager()
}

// Handle process termination
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
