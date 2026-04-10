"use client"

import { useState, useCallback } from "react"
import { useNetwork } from "@/contexts/network-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Users, RefreshCw, ArrowDownLeft, ArrowUpRight, AlertTriangle } from "lucide-react"
import { LoadingState, EmptyState } from "@/components/ui"
import { useEffect } from "react"

interface Peer {
  addr: string
  version: number
  subver: string
  pingtime: number
  conntime: number
  startingheight: number
  banscore: number
  bytessent: number
  bytesrecv: number
  inbound: boolean
  synced_headers: number
  synced_blocks: number
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

function formatDuration(conntime: number): string {
  const now = Math.floor(Date.now() / 1000)
  const seconds = now - conntime
  if (seconds < 0) return "just now"
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ${minutes % 60}m`
  const days = Math.floor(hours / 24)
  return `${days}d ${hours % 24}h`
}

function cleanSubver(subver: string): string {
  return subver.replace(/^\/(.*)\/$/, "$1")
}

export default function PeersPage() {
  const { currentNetwork } = useNetwork()
  const [peers, setPeers] = useState<Peer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPeers = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/peers?network=${currentNetwork}`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      setPeers(data.peers ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }, [currentNetwork])

  useEffect(() => {
    fetchPeers()
    const interval = setInterval(fetchPeers, 30_000)
    return () => clearInterval(interval)
  }, [fetchPeers])

  if (loading && peers.length === 0) {
    return (
      <div className="flex-1 space-y-3 sm:space-y-4 p-2 pt-3 sm:p-4 md:p-6 lg:p-8">
        <LoadingState message="Loading peer information..." />
      </div>
    )
  }

  if (error && peers.length === 0) {
    return (
      <div className="flex-1 space-y-3 sm:space-y-4 p-2 pt-3 sm:p-4 md:p-6 lg:p-8">
        <EmptyState
          icon={AlertTriangle}
          title="Error Loading Peers"
          description={error}
          action={{
            label: "Try Again",
            onClick: fetchPeers,
          }}
        />
      </div>
    )
  }

  const inboundCount = peers.filter((p) => p.inbound).length
  const outboundCount = peers.filter((p) => !p.inbound).length

  return (
    <div className="flex-1 space-y-3 sm:space-y-4 p-2 pt-3 sm:p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Connected Peers</h2>
          <p className="text-sm text-muted-foreground sm:text-base">
            Live view of nodes connected to the FairCoin network
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-sm">
            {currentNetwork.toUpperCase()}
          </Badge>
          <Button onClick={fetchPeers} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-3 sm:gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Peers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{peers.length}</div>
            <p className="text-xs text-muted-foreground">Connected nodes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inbound</CardTitle>
            <ArrowDownLeft className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inboundCount}</div>
            <p className="text-xs text-muted-foreground">Peers connecting to us</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outbound</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{outboundCount}</div>
            <p className="text-xs text-muted-foreground">Peers we connect to</p>
          </CardContent>
        </Card>
      </div>

      {/* Peers Table */}
      {peers.length > 0 ? (
        <div className="rounded-md border overflow-auto custom-scrollbar">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Address</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead>Latency</TableHead>
                <TableHead>Connected</TableHead>
                <TableHead>Start Height</TableHead>
                <TableHead>Ban Score</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Synced</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {peers.map((peer) => (
                <TableRow key={peer.addr}>
                  <TableCell className="font-mono text-sm whitespace-nowrap">
                    {peer.addr}
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap">
                    {cleanSubver(peer.subver) || "Unknown"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={peer.inbound ? "secondary" : "outline"} className="whitespace-nowrap">
                      {peer.inbound ? (
                        <><ArrowDownLeft className="h-3 w-3 mr-1" />Inbound</>
                      ) : (
                        <><ArrowUpRight className="h-3 w-3 mr-1" />Outbound</>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm whitespace-nowrap">
                    {peer.pingtime > 0 ? `${(peer.pingtime * 1000).toFixed(0)} ms` : "N/A"}
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap">
                    {peer.conntime > 0 ? formatDuration(peer.conntime) : "N/A"}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {peer.startingheight.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-sm">
                    <Badge variant={peer.banscore > 0 ? "destructive" : "outline"}>
                      {peer.banscore}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap">
                    {formatBytes(peer.bytessent + peer.bytesrecv)}
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap font-mono">
                    {peer.synced_headers} / {peer.synced_blocks}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-8">
          <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No Peers Connected</h3>
          <p className="text-muted-foreground">
            The node does not have any connected peers at the moment.
          </p>
        </div>
      )}
    </div>
  )
}
