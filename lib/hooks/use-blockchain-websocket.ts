"use client"

// WebSocket React Hook for FairCoin Explorer

import { useEffect, useRef, useState, useCallback } from 'react'
import {
  NetworkType,
  WebSocketEvent,
  ConnectionState,
  WebSocketEventType,
  ClientMessage
} from '../websocket-types'

interface UseBlockchainWebSocketOptions {
  network?: NetworkType
  autoConnect?: boolean
  reconnectOnNetworkChange?: boolean
}

interface UseBlockchainWebSocketReturn {
  isConnected: boolean
  connectionState: ConnectionState
  lastMessage: WebSocketEvent | null
  error: Error | null
  send: (message: ClientMessage) => void
  reconnect: () => void
  disconnect: () => void
  subscribe: (events: WebSocketEventType[]) => void
  unsubscribe: (events: WebSocketEventType[]) => void
}

export function useBlockchainWebSocket(
  options: UseBlockchainWebSocketOptions = {}
): UseBlockchainWebSocketReturn {
  const {
    network = 'mainnet',
    autoConnect = true,
    reconnectOnNetworkChange = true
  } = options

  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected')
  const [lastMessage, setLastMessage] = useState<WebSocketEvent | null>(null)
  const [error, setError] = useState<Error | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectDelay = 30000 // 30 seconds
  const initialReconnectDelay = 1000 // 1 second

  /**
   * Calculate reconnect delay with exponential backoff
   */
  const calculateReconnectDelay = useCallback((): number => {
    const attempt = reconnectAttemptsRef.current
    const delay = Math.min(
      initialReconnectDelay * Math.pow(2, attempt),
      maxReconnectDelay
    )
    return delay
  }, [])

  /**
   * Connect to WebSocket
   */
  const connect = useCallback(() => {
    // Don't connect if already connected or connecting
    if (
      wsRef.current &&
      (wsRef.current.readyState === WebSocket.CONNECTING ||
        wsRef.current.readyState === WebSocket.OPEN)
    ) {
      return
    }

    setConnectionState('connecting')
    setError(null)

    try {
      // Determine WebSocket URL
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const host = window.location.host
      const wsUrl = `${protocol}//${host}/api/ws`

      console.log('[useBlockchainWebSocket] Connecting to:', wsUrl)

      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('[useBlockchainWebSocket] Connected')
        setConnectionState('connected')
        setError(null)
        reconnectAttemptsRef.current = 0

        // Subscribe to network on connection
        const subscribeMessage: ClientMessage = {
          type: 'change-network',
          network
        }
        ws.send(JSON.stringify(subscribeMessage))
      }

      ws.onmessage = (event) => {
        try {
          const message: WebSocketEvent = JSON.parse(event.data)
          setLastMessage(message)

          // Handle special message types
          if (message.type === 'error') {
            console.error('[useBlockchainWebSocket] Server error:', message.data)
          }
        } catch (error) {
          console.error('[useBlockchainWebSocket] Error parsing message:', error)
        }
      }

      ws.onerror = (event) => {
        console.error('[useBlockchainWebSocket] WebSocket error:', event)
        setError(new Error('WebSocket error'))
        setConnectionState('error')
      }

      ws.onclose = (event) => {
        console.log('[useBlockchainWebSocket] Disconnected:', event.code, event.reason)
        setConnectionState('disconnected')
        wsRef.current = null

        // Auto-reconnect if not a clean close
        if (event.code !== 1000 && autoConnect) {
          const delay = calculateReconnectDelay()
          console.log(`[useBlockchainWebSocket] Reconnecting in ${delay}ms...`)

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++
            connect()
          }, delay)
        }
      }
    } catch (error) {
      console.error('[useBlockchainWebSocket] Connection error:', error)
      setError(error instanceof Error ? error : new Error('Unknown connection error'))
      setConnectionState('error')
    }
  }, [network, autoConnect, calculateReconnectDelay])

  /**
   * Disconnect from WebSocket
   */
  const disconnect = useCallback(() => {
    console.log('[useBlockchainWebSocket] Disconnecting...')

    // Clear reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close(1000, 'Client disconnect')
      wsRef.current = null
    }

    setConnectionState('disconnected')
  }, [])

  /**
   * Reconnect to WebSocket
   */
  const reconnect = useCallback(() => {
    console.log('[useBlockchainWebSocket] Manual reconnect')
    disconnect()
    reconnectAttemptsRef.current = 0
    connect()
  }, [connect, disconnect])

  /**
   * Send message to server
   */
  const send = useCallback((message: ClientMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    } else {
      console.warn('[useBlockchainWebSocket] Cannot send message: not connected')
    }
  }, [])

  /**
   * Subscribe to event types
   */
  const subscribe = useCallback((events: WebSocketEventType[]) => {
    const message: ClientMessage = {
      type: 'subscribe',
      events
    }
    send(message)
  }, [send])

  /**
   * Unsubscribe from event types
   */
  const unsubscribe = useCallback((events: WebSocketEventType[]) => {
    const message: ClientMessage = {
      type: 'unsubscribe',
      events
    }
    send(message)
  }, [send])

  /**
   * Connect on mount if autoConnect is true
   */
  useEffect(() => {
    if (autoConnect) {
      connect()
    }

    return () => {
      disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /**
   * Handle network changes
   */
  useEffect(() => {
    if (reconnectOnNetworkChange && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log('[useBlockchainWebSocket] Network changed, sending change-network message')
      const message: ClientMessage = {
        type: 'change-network',
        network
      }
      send(message)
    }
  }, [network, reconnectOnNetworkChange, send])

  return {
    isConnected: connectionState === 'connected',
    connectionState,
    lastMessage,
    error,
    send,
    reconnect,
    disconnect,
    subscribe,
    unsubscribe
  }
}
