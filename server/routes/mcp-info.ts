import { Router, type Request, type Response } from 'express'
import { TOOL_CATALOG } from '../mcp/tool-catalog'

/**
 * GET /api/mcp/info
 *
 * Read-only metadata for the explorer's MCP server, consumed by the public
 * `/tools/mcp` page in the web frontend so visitors can discover the endpoint
 * and the available tools. The tool list is sourced from the SAME
 * {@link TOOL_CATALOG} the MCP server registers from, so it can never drift from
 * what the server actually exposes.
 */

const router = Router()

/** Public MCP endpoint advertised to AI clients. */
const MCP_ENDPOINT = `${(process.env.PUBLIC_BASE_URL || 'https://explorer.fairco.in').replace(/\/+$/, '')}/mcp`

/** Streamable HTTP is the transport wired up in `server/mcp/http.ts`. */
const MCP_TRANSPORT = 'Streamable HTTP'

router.get('/', (_req: Request, res: Response) => {
  res.json({
    endpoint: MCP_ENDPOINT,
    transport: MCP_TRANSPORT,
    tools: TOOL_CATALOG.map(({ name, description, category }) => ({ name, description, category })),
  })
})

export default router
