import { describe, it, expect, afterEach } from "vitest";
import express from "express";
import rateLimit from "express-rate-limit";
import type { Server } from "http";
import { handleMcpRateLimited, isMcpToolCall } from "./http";

describe("isMcpToolCall", () => {
  it("counts tool calls, alone or in a batch", () => {
    expect(isMcpToolCall({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "get_price" } })).toBe(true);
    expect(isMcpToolCall([{ method: "ping" }, { method: "tools/call" }])).toBe(true);
  });

  it("does not count protocol messages", () => {
    for (const method of ["initialize", "notifications/initialized", "tools/list", "ping"]) {
      expect(isMcpToolCall({ jsonrpc: "2.0", id: 1, method })).toBe(false);
    }
    expect(isMcpToolCall(undefined)).toBe(false);
    expect(isMcpToolCall("tools/call")).toBe(false);
  });
});

describe("the /mcp tool-call cap", () => {
  let server: Server | undefined;
  afterEach(() => server?.close());

  async function start(max: number): Promise<string> {
    const app = express();
    app.use(express.json());
    app.post(
      "/mcp",
      rateLimit({ windowMs: 60_000, max, skip: (req) => !isMcpToolCall(req.body), handler: handleMcpRateLimited }),
      (_req, res) => { res.json({ ok: true }); },
    );
    server = app.listen(0);
    await new Promise((resolve) => server!.once("listening", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("no port");
    return `http://127.0.0.1:${address.port}/mcp`;
  }

  const post = (url: string, body: unknown) =>
    fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

  it("lets a whole session through when only its tool calls count, and answers the overflow as JSON-RPC", async () => {
    const url = await start(2);
    // A client's session: initialize, initialized, tools/list — free.
    for (const method of ["initialize", "notifications/initialized", "tools/list", "initialize", "tools/list"]) {
      expect((await post(url, { jsonrpc: "2.0", id: 1, method })).status).toBe(200);
    }
    expect((await post(url, { jsonrpc: "2.0", id: 2, method: "tools/call" })).status).toBe(200);
    expect((await post(url, { jsonrpc: "2.0", id: 3, method: "tools/call" })).status).toBe(200);

    const over = await post(url, { jsonrpc: "2.0", id: 4, method: "tools/call" });
    expect(over.status).toBe(429);
    expect(await over.json()).toMatchObject({ jsonrpc: "2.0", id: 4, error: { code: -32000 } });
    expect(over.headers.get("access-control-allow-origin")).toBe("*");

    // Protocol messages still pass while tool calls are capped.
    expect((await post(url, { jsonrpc: "2.0", id: 5, method: "tools/list" })).status).toBe(200);
  });
});
