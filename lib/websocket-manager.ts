// WebSocket Connection Manager for FairCoin Explorer

import {
  ConnectionInfo,
  NetworkType,
  WebSocketEvent,
  WebSocketEventType,
  WebSocketManagerConfig,
  ServerMessage
} from './websocket-types'

export class WebSocketManager {
  private connections: Map<string, ConnectionInfo>
  private connectionsByIP: Map<string, Set<string>>
  private connectionsByNetwork: Map<NetworkType, Set<string>>
  private config: Required<WebSocketManagerConfig>
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor(config?: WebSocketManagerConfig) {
    this.connections = new Map()
    this.connectionsByIP = new Map()
    this.connectionsByNetwork = new Map()

    this.config = {
      maxConnectionsPerIP: config?.maxConnectionsPerIP ?? 5,
      heartbeatInterval: config?.heartbeatInterval ?? 30000,
      connectionTimeout: config?.connectionTimeout ?? 300000 // 5 minutes
    }

    // Initialize network maps
    this.connectionsByNetwork.set('mainnet', new Set())
    this.connectionsByNetwork.set('testnet', new Set())

    // Start cleanup interval
    this.startCleanup()
  }

  /**
   * Register a new WebSocket connection
   */
  register(socket: any, network: NetworkType, ip?: string): string {
    const connectionId = this.generateConnectionId()

    // Check rate limit if IP provided
    if (ip && !this.checkRateLimit(ip)) {
      throw new Error(`Connection limit exceeded for IP: ${ip}`)
    }

    const connectionInfo: ConnectionInfo = {
      id: connectionId,
      socket,
      network,
      subscribedEvents: new Set(),
      lastActivity: new Date(),
      ip
    }

    // Store connection
    this.connections.set(connectionId, connectionInfo)

    // Track by network
    this.connectionsByNetwork.get(network)?.add(connectionId)

    // Track by IP
    if (ip) {
      if (!this.connectionsByIP.has(ip)) {
        this.connectionsByIP.set(ip, new Set())
      }
      this.connectionsByIP.get(ip)?.add(connectionId)
    }

    console.log(`[WebSocketManager] Registered connection ${connectionId} for ${network} (Total: ${this.connections.size})`)

    return connectionId
  }

  /**
   * Unregister a WebSocket connection
   */
  unregister(connectionId: string): boolean {
    const connection = this.connections.get(connectionId)
    if (!connection) {
      return false
    }

    // Remove from network tracking
    this.connectionsByNetwork.get(connection.network)?.delete(connectionId)

    // Remove from IP tracking
    if (connection.ip) {
      const ipConnections = this.connectionsByIP.get(connection.ip)
      if (ipConnections) {
        ipConnections.delete(connectionId)
        if (ipConnections.size === 0) {
          this.connectionsByIP.delete(connection.ip)
        }
      }
    }

    // Remove main connection
    this.connections.delete(connectionId)

    console.log(`[WebSocketManager] Unregistered connection ${connectionId} (Remaining: ${this.connections.size})`)

    return true
  }

  /**
   * Get connection by ID
   */
  getConnection(connectionId: string): ConnectionInfo | undefined {
    return this.connections.get(connectionId)
  }

  /**
   * Update last activity timestamp
   */
  updateActivity(connectionId: string): void {
    const connection = this.connections.get(connectionId)
    if (connection) {
      connection.lastActivity = new Date()
    }
  }

  /**
   * Subscribe connection to events
   */
  subscribe(connectionId: string, events: WebSocketEventType[]): boolean {
    const connection = this.connections.get(connectionId)
    if (!connection) {
      return false
    }

    events.forEach(event => connection.subscribedEvents.add(event))
    this.updateActivity(connectionId)

    console.log(`[WebSocketManager] Connection ${connectionId} subscribed to:`, events)

    return true
  }

  /**
   * Unsubscribe connection from events
   */
  unsubscribe(connectionId: string, events: WebSocketEventType[]): boolean {
    const connection = this.connections.get(connectionId)
    if (!connection) {
      return false
    }

    events.forEach(event => connection.subscribedEvents.delete(event))
    this.updateActivity(connectionId)

    return true
  }

  /**
   * Change network for a connection
   */
  changeNetwork(connectionId: string, newNetwork: NetworkType): boolean {
    const connection = this.connections.get(connectionId)
    if (!connection) {
      return false
    }

    // Remove from old network
    this.connectionsByNetwork.get(connection.network)?.delete(connectionId)

    // Add to new network
    connection.network = newNetwork
    this.connectionsByNetwork.get(newNetwork)?.add(connectionId)

    this.updateActivity(connectionId)

    console.log(`[WebSocketManager] Connection ${connectionId} switched to ${newNetwork}`)

    return true
  }

  /**
   * Broadcast event to all connections matching criteria
   */
  broadcast(event: WebSocketEvent, network?: NetworkType): number {
    let sentCount = 0
    const connections = network
      ? this.getConnectionsByNetwork(network)
      : Array.from(this.connections.values())

    connections.forEach(connection => {
      // Check if connection is subscribed to this event type
      // If no subscriptions, send all events (default behavior)
      if (
        connection.subscribedEvents.size === 0 ||
        connection.subscribedEvents.has(event.type)
      ) {
        if (this.sendToConnection(connection, event)) {
          sentCount++
        }
      }
    })

    if (sentCount > 0) {
      console.log(`[WebSocketManager] Broadcasted ${event.type} to ${sentCount} connections`)
    }

    return sentCount
  }

  /**
   * Send event to specific connection
   */
  broadcastToConnection(connectionId: string, event: WebSocketEvent): boolean {
    const connection = this.connections.get(connectionId)
    if (!connection) {
      return false
    }

    return this.sendToConnection(connection, event)
  }

  /**
   * Get connections by network
   */
  getConnectionsByNetwork(network: NetworkType): ConnectionInfo[] {
    const connectionIds = this.connectionsByNetwork.get(network) || new Set()
    return Array.from(connectionIds)
      .map(id => this.connections.get(id))
      .filter((conn): conn is ConnectionInfo => conn !== undefined)
  }

  /**
   * Get connections by IP
   */
  getConnectionsByIP(ip: string): ConnectionInfo[] {
    const connectionIds = this.connectionsByIP.get(ip) || new Set()
    return Array.from(connectionIds)
      .map(id => this.connections.get(id))
      .filter((conn): conn is ConnectionInfo => conn !== undefined)
  }

  /**
   * Get connection metrics
   */
  getMetrics() {
    return {
      totalConnections: this.connections.size,
      mainnetConnections: this.connectionsByNetwork.get('mainnet')?.size || 0,
      testnetConnections: this.connectionsByNetwork.get('testnet')?.size || 0,
      uniqueIPs: this.connectionsByIP.size
    }
  }

  /**
   * Check rate limit for IP
   */
  private checkRateLimit(ip: string): boolean {
    const connections = this.getConnectionsByIP(ip)
    return connections.length < this.config.maxConnectionsPerIP
  }

  /**
   * Send message to connection
   */
  private sendToConnection(connection: ConnectionInfo, event: ServerMessage): boolean {
    try {
      const message = JSON.stringify(event)

      // Check if socket is open (readyState === 1 for WebSocket.OPEN)
      if (connection.socket.readyState === 1) {
        connection.socket.send(message)
        this.updateActivity(connection.id)
        return true
      }

      return false
    } catch (error) {
      console.error(`[WebSocketManager] Error sending to connection ${connection.id}:`, error)
      return false
    }
  }

  /**
   * Generate unique connection ID
   */
  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  }

  /**
   * Start cleanup interval for inactive connections
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveConnections()
    }, 60000) // Run every minute
  }

  /**
   * Cleanup inactive connections
   */
  cleanupInactiveConnections(): void {
    const now = Date.now()
    const timeout = this.config.connectionTimeout
    const inactiveConnections: string[] = []

    this.connections.forEach((connection, id) => {
      const inactiveTime = now - connection.lastActivity.getTime()
      if (inactiveTime > timeout) {
        inactiveConnections.push(id)
      }
    })

    inactiveConnections.forEach(id => {
      const connection = this.connections.get(id)
      if (connection) {
        console.log(`[WebSocketManager] Closing inactive connection ${id}`)
        try {
          connection.socket.close()
        } catch (error) {
          console.error(`[WebSocketManager] Error closing connection ${id}:`, error)
        }
        this.unregister(id)
      }
    })

    if (inactiveConnections.length > 0) {
      console.log(`[WebSocketManager] Cleaned up ${inactiveConnections.length} inactive connections`)
    }
  }

  /**
   * Shutdown manager and close all connections
   */
  shutdown(): void {
    console.log(`[WebSocketManager] Shutting down (${this.connections.size} active connections)`)

    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }

    // Close all connections
    this.connections.forEach((connection, id) => {
      try {
        connection.socket.close()
      } catch (error) {
        console.error(`[WebSocketManager] Error closing connection ${id}:`, error)
      }
    })

    // Clear all maps
    this.connections.clear()
    this.connectionsByIP.clear()
    this.connectionsByNetwork.clear()

    console.log('[WebSocketManager] Shutdown complete')
  }
}

// Singleton instance
let wsManagerInstance: WebSocketManager | null = null

export function getWebSocketManager(config?: WebSocketManagerConfig): WebSocketManager {
  if (!wsManagerInstance) {
    wsManagerInstance = new WebSocketManager(config)
  }
  return wsManagerInstance
}

export function shutdownWebSocketManager(): void {
  if (wsManagerInstance) {
    wsManagerInstance.shutdown()
    wsManagerInstance = null
  }
}
