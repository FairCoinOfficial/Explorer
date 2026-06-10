import { Router, type Request, type Response } from "express";
import { rpcWithNetwork } from "@fairco.in/rpc-client";
import { handleRouteError, parseNetwork } from "../lib/http";

const router = Router();

/**
 * Upper bound on the raw tx hex accepted for broadcast. Standard transactions
 * are far below 100 KB; the JSON body limit (64kb) already bounds the request,
 * this keeps the error explicit instead of a generic body-parser failure.
 */
const MAX_TX_HEX_CHARS = 200_000;

/**
 * POST /api/tx/broadcast
 * Broadcast a raw transaction hex to the network.
 */
router.post("/broadcast", async (req: Request, res: Response) => {
  try {
    const network = parseNetwork(req.query.network);
    const { hex } = req.body as { hex?: string };

    if (!hex || typeof hex !== "string" || hex.length === 0) {
      res.status(400).json({ error: "Missing or invalid 'hex' field in request body" });
      return;
    }

    if (hex.length > MAX_TX_HEX_CHARS) {
      res.status(400).json({ error: "Transaction hex too large" });
      return;
    }

    // Validate hex string format (even length: whole bytes)
    if (hex.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(hex)) {
      res.status(400).json({ error: "Invalid hex string: must be an even-length hexadecimal string" });
      return;
    }

    try {
      const txid = await rpcWithNetwork<string>("sendrawtransaction", [hex], network);
      res.json({ txid });
    } catch (error: unknown) {
      // Daemon rejection (bad tx, already in chain, etc.) is a client error, but
      // log the full detail server-side and return a sanitized summary only.
      console.error("Broadcast rejected by daemon:", error);
      res.status(400).json({ error: "Transaction rejected by the network node" });
    }
  } catch (error: unknown) {
    handleRouteError(res, "Error broadcasting transaction", error);
  }
});

export default router;
