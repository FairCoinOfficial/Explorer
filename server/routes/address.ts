import { Router, type Request, type Response } from "express";
import { rpcWithNetwork, type NetworkType } from "@fairco.in/rpc-client";
import { blockCache } from "../lib/cache";
import { handleRouteError, parseNetwork, parseAddress } from "../lib/http";

const router = Router();

/** Satoshis-per-FAIR constant for conversion */
const SATS_PER_FAIR = 100_000_000;

// ---------------------------------------------------------------------------
// Types for RPC responses
// ---------------------------------------------------------------------------

interface AddressBalanceRPC {
  balance: number;
  received: number;
}

interface AddressUTXORPC {
  txid: string;
  outputIndex: number;
  satoshis: number;
  script: string;
  height: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Attempts to use addressindex RPC calls. Returns null if the node does
 * not support them (e.g. addressindex is not enabled).
 */
async function tryGetAddressBalance(
  address: string,
  network: NetworkType,
): Promise<AddressBalanceRPC | null> {
  try {
    return await rpcWithNetwork<AddressBalanceRPC>(
      "getaddressbalance",
      [{ addresses: [address] }],
      network,
    );
  } catch {
    return null;
  }
}

async function tryGetAddressUTXOs(
  address: string,
  network: NetworkType,
): Promise<AddressUTXORPC[] | null> {
  try {
    return await rpcWithNetwork<AddressUTXORPC[]>(
      "getaddressutxos",
      [{ addresses: [address] }],
      network,
    );
  } catch {
    return null;
  }
}

async function tryGetAddressTxids(
  address: string,
  network: NetworkType,
): Promise<string[] | null> {
  try {
    return await rpcWithNetwork<string[]>(
      "getaddresstxids",
      [{ addresses: [address] }],
      network,
    );
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/**
 * GET /api/address/:address
 * Returns balance, totals, tx count, and UTXOs for an address.
 */
router.get("/:address", async (req: Request, res: Response) => {
  try {
    const network = parseNetwork(req.query.network);
    const address = parseAddress(req.params.address);

    // Try addressindex RPC first
    const balanceResult = await tryGetAddressBalance(address, network);
    const utxos = await tryGetAddressUTXOs(address, network);
    const txids = await tryGetAddressTxids(address, network);

    if (balanceResult !== null) {
      // addressindex is available
      const balanceSats = balanceResult.balance;
      const totalReceivedSats = balanceResult.received;
      const totalSentSats = totalReceivedSats - balanceSats;

      const addressInfo = {
        address,
        balance: balanceSats / SATS_PER_FAIR,
        balanceSat: balanceSats,
        totalReceived: totalReceivedSats / SATS_PER_FAIR,
        totalReceivedSat: totalReceivedSats,
        totalSent: totalSentSats / SATS_PER_FAIR,
        totalSentSat: totalSentSats,
        txCount: txids?.length ?? 0,
        utxos: utxos ?? [],
      };

      res.json({ addressInfo, network });
      return;
    }

    // Fallback: validate via RPC and return stub with validation status
    let isValid = false;
    try {
      const validation = await blockCache.validateAddress(address, network);
      isValid = Boolean(validation?.isvalid);
    } catch {
      // validation not available
    }

    const addressInfo = {
      address,
      balance: 0,
      balanceSat: 0,
      totalReceived: 0,
      totalReceivedSat: 0,
      totalSent: 0,
      totalSentSat: 0,
      txCount: 0,
      utxos: [] as AddressUTXORPC[],
      isValid,
      note: "addressindex not enabled on node; limited data available",
    };

    res.json({ addressInfo, network });
  } catch (error: unknown) {
    handleRouteError(res, "Error fetching address info", error);
  }
});

/**
 * GET /api/address/:address/utxos
 * Returns UTXO list for an address.
 */
router.get("/:address/utxos", async (req: Request, res: Response) => {
  try {
    const network = parseNetwork(req.query.network);
    const address = parseAddress(req.params.address);

    const utxos = await tryGetAddressUTXOs(address, network);

    if (utxos !== null) {
      res.json({ utxos, network });
      return;
    }

    res.json({
      utxos: [],
      network,
      note: "addressindex not enabled on node; UTXO data unavailable",
    });
  } catch (error: unknown) {
    handleRouteError(res, "Error fetching UTXOs", error);
  }
});

/**
 * GET /api/address/:address/txs?page=1&limit=20
 * Returns paginated transaction history for an address, with the net amount
 * and direction computed server-side from the enriched prevouts.
 */
router.get("/:address/txs", async (req: Request, res: Response) => {
  try {
    const network = parseNetwork(req.query.network);
    const address = parseAddress(req.params.address);
    const page = Math.max(1, parseInt(req.query.page as string || "1", 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string || "20", 10) || 20));

    const txids = await tryGetAddressTxids(address, network);

    if (txids === null) {
      res.json({
        transactions: [],
        page,
        limit,
        total: 0,
        network,
        note: "addressindex not enabled on node; transaction history unavailable",
      });
      return;
    }

    // Reverse to get newest first, then paginate
    const reversed = [...txids].reverse();
    const total = reversed.length;
    const startIdx = (page - 1) * limit;
    const pageTxids = reversed.slice(startIdx, startIdx + limit);

    interface TxVout { value?: number; scriptPubKey?: { addresses?: string[] } }
    interface TxVin { coinbase?: string; prevout?: { value?: number; addresses?: string[] } }

    // Fetch transaction details and compute the address-relative net amount.
    const transactions = [];
    for (const txid of pageTxids) {
      try {
        const tx = await blockCache.getTransaction(txid, network, true);
        const vouts = (tx.vout ?? []) as TxVout[];
        const vins = (tx.vin ?? []) as TxVin[];

        const received = vouts.reduce((sum, v) =>
          v.scriptPubKey?.addresses?.includes(address) ? sum + (v.value ?? 0) : sum, 0);
        const sent = vins.reduce((sum, v) =>
          v.prevout?.addresses?.includes(address) ? sum + (v.prevout.value ?? 0) : sum, 0);
        const amount = received - sent;

        transactions.push({
          txid: tx.txid,
          blockhash: tx.blockhash ?? null,
          blockHeight: typeof tx.blockheight === "number" ? tx.blockheight : null,
          confirmations: tx.confirmations ?? 0,
          time: tx.time ?? tx.blocktime ?? 0,
          size: tx.size ?? 0,
          amount,
          type: amount >= 0 ? "received" : "sent",
        });
      } catch {
        // Transaction not available, include only the txid
        transactions.push({ txid, blockhash: null, blockHeight: null, confirmations: 0, time: 0, size: 0, amount: 0, type: "received" });
      }
    }

    res.json({ transactions, page, limit, total, network });
  } catch (error: unknown) {
    handleRouteError(res, "Error fetching address transactions", error);
  }
});

export default router;
