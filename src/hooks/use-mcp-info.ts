import { useQuery } from '@tanstack/react-query'

/** Presentation grouping for an MCP tool, mirrored from the server tool catalog. */
export type McpToolCategory = 'discovery' | 'blockchain' | 'wallet'

export interface McpTool {
  name: string
  description: string
  category: McpToolCategory
}

export interface McpInfo {
  endpoint: string
  transport: string
  tools: McpTool[]
}

export type McpInfoResult =
  | { status: 'ok'; data: McpInfo }
  | { status: 'unavailable' }

const VALID_CATEGORIES: readonly McpToolCategory[] = ['discovery', 'blockchain', 'wallet']

function isMcpTool(value: unknown): value is McpTool {
  if (typeof value !== 'object' || value === null) return false
  const tool = value as Record<string, unknown>
  return (
    typeof tool.name === 'string' &&
    typeof tool.description === 'string' &&
    typeof tool.category === 'string' &&
    (VALID_CATEGORIES as readonly string[]).includes(tool.category)
  )
}

function isMcpInfo(value: unknown): value is McpInfo {
  if (typeof value !== 'object' || value === null) return false
  const info = value as Record<string, unknown>
  return (
    typeof info.endpoint === 'string' &&
    typeof info.transport === 'string' &&
    Array.isArray(info.tools) &&
    info.tools.every(isMcpTool)
  )
}

/**
 * Fetches MCP server metadata (endpoint, transport, tool catalog) from the
 * explorer's `/api/mcp/info` endpoint. In environments where the endpoint is not
 * present the SPA fallback returns HTML, so any non-JSON / error response is
 * treated as "unavailable" and the UI renders a graceful placeholder.
 */
export function useMcpInfo() {
  return useQuery<McpInfoResult>({
    queryKey: ['mcp-info'],
    queryFn: async (): Promise<McpInfoResult> => {
      try {
        const response = await fetch('/api/mcp/info', {
          headers: { Accept: 'application/json' },
        })
        if (!response.ok) {
          return { status: 'unavailable' }
        }
        const contentType = response.headers.get('content-type') ?? ''
        if (!contentType.includes('application/json')) {
          return { status: 'unavailable' }
        }
        const data: unknown = await response.json()
        if (!isMcpInfo(data)) {
          return { status: 'unavailable' }
        }
        return { status: 'ok', data }
      } catch {
        return { status: 'unavailable' }
      }
    },
    staleTime: 60 * 60_000,
    retry: false,
  })
}
