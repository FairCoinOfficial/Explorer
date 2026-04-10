// WebSocket Types and Interfaces for FairCoin Explorer

export type NetworkType = 'mainnet' | 'testnet'

export type WebSocketEventType =
  | 'new-block'
  | 'block-count'
  | 'mempool-update'
  | 'transaction-confirmed'
  | 'network-stats'
  | 'ping'
  | 'pong'
  | 'subscribe'
  | 'unsubscribe'
  | 'error'

// Base WebSocket Event
export interface WebSocketEvent {
  type: WebSocketEventType
  network: NetworkType
  timestamp: number
  data?: any
}

// Block Data Interface
export interface BlockData {
  hash: string
  height: number
  time: number
  nTx: number
  size: number
  difficulty: number
  tx: string[]
  previousblockhash?: string
  nextblockhash?: string
}

// New Block Event
export interface NewBlockEvent extends WebSocketEvent {
  type: 'new-block'
  data: BlockData
}

// Block Count Event
export interface BlockCountEvent extends WebSocketEvent {
  type: 'block-count'
  data: {
    height: number
    previousHeight: number
  }
}

// Mempool Transaction Interface
export interface MempoolTransaction {
  txid: string
  size: number
  fee: number
  feeRate: number
  time: number
  depends: string[]
}

// Mempool Update Event
export interface MempoolUpdateEvent extends WebSocketEvent {
  type: 'mempool-update'
  data: {
    size: number
    bytes: number
    usage: number
    maxmempool: number
    mempoolminfee: number
    transactions: MempoolTransaction[]
  }
}

// Transaction Confirmed Event
export interface TransactionConfirmedEvent extends WebSocketEvent {
  type: 'transaction-confirmed'
  data: {
    txid: string
    blockHeight: number
    blockHash: string
    confirmations: number
  }
}

// Network Stats Event
export interface NetworkStatsEvent extends WebSocketEvent {
  type: 'network-stats'
  data: {
    connections: number
    difficulty: number
    hashrate: string
    version: string
    subversion?: string
    protocolversion?: number
  }
}

// Ping/Pong Events
export interface PingEvent extends WebSocketEvent {
  type: 'ping'
  data?: undefined
}

export interface PongEvent extends WebSocketEvent {
  type: 'pong'
  data?: {
    latency: number
  }
}

// Subscribe/Unsubscribe Events
export interface SubscribeEvent extends WebSocketEvent {
  type: 'subscribe'
  data: {
    events: WebSocketEventType[]
  }
}

export interface UnsubscribeEvent extends WebSocketEvent {
  type: 'unsubscribe'
  data: {
    events: WebSocketEventType[]
  }
}

// Error Event
export interface ErrorEvent extends WebSocketEvent {
  type: 'error'
  data: {
    code: string
    message: string
    details?: any
  }
}

// Union type of all possible events
export type WebSocketMessage =
  | NewBlockEvent
  | BlockCountEvent
  | MempoolUpdateEvent
  | TransactionConfirmedEvent
  | NetworkStatsEvent
  | PingEvent
  | PongEvent
  | SubscribeEvent
  | UnsubscribeEvent
  | ErrorEvent

// Connection State
export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error'

// Connection Metadata
export interface ConnectionInfo {
  id: string
  socket: WebSocket | any
  network: NetworkType
  subscribedEvents: Set<WebSocketEventType>
  lastActivity: Date
  ip?: string
}

// WebSocket Manager Config
export interface WebSocketManagerConfig {
  maxConnectionsPerIP?: number
  heartbeatInterval?: number
  connectionTimeout?: number
}

// Blockchain Monitor Config
export interface BlockchainMonitorConfig {
  pollInterval: number
  networks: NetworkType[]
  enabled: boolean
}

// Network State for Monitoring
export interface NetworkState {
  network: NetworkType
  blockHeight: number
  blockHash: string
  mempoolSize: number
  mempoolBytes: number
  connections: number
  difficulty: number
  hashrate: string
  lastUpdate: Date
}

// Client Message (messages sent from client to server)
export interface ClientMessage {
  type: 'subscribe' | 'unsubscribe' | 'ping' | 'change-network'
  network?: NetworkType
  events?: WebSocketEventType[]
}

// Server Message (messages sent from server to client)
export type ServerMessage = WebSocketMessage

// Event Handler Type
export type EventHandler = (event: WebSocketEvent) => void

// Reconnection Config
export interface ReconnectionConfig {
  maxDelay: number
  initialDelay: number
  factor: number
  maxAttempts?: number
}
