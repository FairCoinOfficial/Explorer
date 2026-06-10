import { Router, type Request, type Response } from "express";
import { rpcWithNetwork } from "@fairco.in/rpc-client";
import { handleRouteError, parseNetwork } from "../lib/http";

const router = Router();

/** Default fee per KB in FAIR when the node cannot estimate */
const DEFAULT_FEE_PER_KB = 0.0001;

/** Confirmation target in blocks */
const CONFIRMATION_BLOCKS = 6;

/**
 * GET /api/fee-estimate
 * Returns estimated fee per byte for a given confirmation target.
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const network = parseNetwork(req.query.network);

    let feePerKb: number;
    try {
      feePerKb = await rpcWithNetwork<number>(
        "estimatefee",
        [CONFIRMATION_BLOCKS],
        network,
      );
    } catch {
      // RPC may not support estimatefee; fall back to default
      feePerKb = DEFAULT_FEE_PER_KB;
    }

    // estimatefee returns -1 when insufficient data is available
    if (feePerKb < 0) {
      feePerKb = DEFAULT_FEE_PER_KB;
    }

    // Convert FAIR/KB to satoshis/byte
    // 1 FAIR = 100_000_000 satoshis, 1 KB = 1000 bytes
    const feePerByte = Math.ceil((feePerKb * 100_000_000) / 1000);

    res.json({
      feePerKb,
      feePerByte,
      blocks: CONFIRMATION_BLOCKS,
      network,
    });
  } catch (error: unknown) {
    handleRouteError(res, "Error estimating fee", error);
  }
});

export default router;
