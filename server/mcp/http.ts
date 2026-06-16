// Stateless Streamable HTTP transport wiring for the FairCoin Explorer MCP
// server, mounted at `/mcp` by `server/index.ts`.
//
// Stateless mode: a fresh `McpServer` + `StreamableHTTPServerTransport` is built
// per POST request (no session store). This is the simplest correct setup behind
// a single Express instance — there is no shared per-session state to coordinate,
// so it scales horizontally without sticky sessions. GET and DELETE return 405
// because a stateless server holds no SSE stream or session to address.

import type { Request, Response } from "express";
import { randomUUID } from "crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createFaircoinMcpServer } from "./server";
import { logger } from "../lib/logger";

/** JSON-RPC error code for a method the server does not support. */
const JSONRPC_METHOD_NOT_FOUND = -32601;
/** JSON-RPC error code for an internal server error. */
const JSONRPC_INTERNAL_ERROR = -32603;

/**
 * CORS headers for the MCP endpoint. AI clients connect cross-origin, so any
 * origin is allowed; the MCP protocol headers (`mcp-session-id`,
 * `mcp-protocol-version`) plus `authorization` are permitted, and
 * `Mcp-Session-Id` is exposed so a client can read it from the response.
 */
export function applyMcpCors(res: Response): void {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, mcp-session-id, mcp-protocol-version, authorization",
  );
  res.header("Access-Control-Expose-Headers", "Mcp-Session-Id");
}

/** Handle the CORS preflight for `/mcp`. */
export function handleMcpOptions(_req: Request, res: Response): void {
  applyMcpCors(res);
  res.sendStatus(204);
}

/**
 * Handle a JSON-RPC request over Streamable HTTP. Creates a fresh server and a
 * stateless transport (`sessionIdGenerator: undefined`) per request, hands the
 * already-parsed body to the transport, and disposes both when the response
 * closes so nothing leaks across requests.
 */
export function createMcpPostHandler(version: string) {
  return async (req: Request, res: Response): Promise<void> => {
    applyMcpCors(res);
    const server = createFaircoinMcpServer(version);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

    res.on("close", () => {
      void transport.close();
      void server.close();
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      logger.error("MCP request handling failed:", error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: JSONRPC_INTERNAL_ERROR, message: "Internal server error" },
          id: null,
        });
      }
    }
  };
}

/**
 * GET/DELETE on a stateless server: there is no SSE stream or session to serve,
 * so reply 405 with a JSON-RPC error (matching the SDK's stateless example).
 * The randomized id keeps the response a well-formed, distinct JSON-RPC object.
 */
export function handleMcpMethodNotAllowed(_req: Request, res: Response): void {
  applyMcpCors(res);
  res.status(405).json({
    jsonrpc: "2.0",
    error: { code: JSONRPC_METHOD_NOT_FOUND, message: "Method not allowed: this MCP server is stateless." },
    id: randomUUID(),
  });
}
