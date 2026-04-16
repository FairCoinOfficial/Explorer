import { Router, type Request, type Response } from "express";
import { rpcWithNetwork, type NetworkType } from "@fairco.in/rpc-client";

const router = Router();

/**
 * POST /api/tx/broadcast
 * Broadcast a raw transaction hex to the network.
 */
router.post("/broadcast", async (req: Request, res: Response) => {
  try {
    const network = (req.query.network as string || "mainnet") as NetworkType;
    const { hex } = req.body as { hex?: string };

    if (!hex || typeof hex !== "string" || hex.length === 0) {
      res.status(400).json({ error: "Missing or invalid 'hex' field in request body" });
      return;
    }

    // Validate hex string format
    if (!/^[0-9a-fA-F]+$/.test(hex)) {
      res.status(400).json({ error: "Invalid hex string: must contain only hexadecimal characters" });
      return;
    }

    const txid = await rpcWithNetwork<string>("sendrawtransaction", [hex], network);
    res.json({ txid });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to broadcast transaction";
    console.error("Error broadcasting transaction:", error);
    res.status(400).json({ error: message });
  }
});

export default router;
