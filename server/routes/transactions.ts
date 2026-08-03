import { Router, type Request, type Response } from "express";
import { rpcWithNetwork } from "@fairco.in/rpc-client";
import { blockCache } from "../lib/cache";
import { handleRouteError, parseLimit, parseNetwork, parseOffset } from "../lib/http";

const router = Router();

/** Max blocks scanned to assemble a recent-tx page (keeps RPC load bounded). */
const MAX_BLOCKS_SCAN = 40;
/** Cap on mempool entries detailed for the unconfirmed prefix of the feed. */
const MAX_MEMPOOL_DETAIL = 20;

export interface RecentTransactionItem {
  txid: string;
  /** Null when the tx is still in the mempool. */
  blockHeight: number | null;
  /** Unix seconds; mempool entry time or block time. */
  time: number;
  /** True when the tx has not yet been included in a block. */
  unconfirmed: boolean;
  size?: number;
  fee?: number;
  /** Total output value (FAIR) of the transaction. Undefined if lookup failed. */
  amount?: number;
}

/**
 * GET /api/transactions?network=&limit=&offset=&includeMempool=1
 *
 * Paginated recent-transaction feed derived from recent blocks (and optionally
 * the mempool for the tip of the feed). Reuses the same recent-blocks cache the
 * home dashboard uses so the UX stays consistent.
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const network = parseNetwork(req.query.network);
    const limit = parseLimit(req.query.limit);
    const offset = parseOffset(req.query.offset);
    const includeMempool =
      req.query.includeMempool === undefined ||
      req.query.includeMempool === "" ||
      req.query.includeMempool === "1" ||
      req.query.includeMempool === "true";

    const mempoolItems: RecentTransactionItem[] = [];
    if (includeMempool) {
      try {
        const rawMempool = await rpcWithNetwork<string[]>("getrawmempool", [], network).catch(
          () => [] as string[],
        );
        const recent = rawMempool.slice(0, MAX_MEMPOOL_DETAIL);
        for (const txid of recent) {
          try {
            const entry = await rpcWithNetwork<Record<string, unknown>>(
              "getmempoolentry",
              [txid],
              network,
            );
            mempoolItems.push({
              txid,
              blockHeight: null,
              time: Number(entry.time ?? Date.now() / 1000),
              unconfirmed: true,
              size: Number(entry.size ?? 0),
              fee: Number(entry.fee ?? 0),
            });
          } catch {
            mempoolItems.push({
              txid,
              blockHeight: null,
              time: Math.floor(Date.now() / 1000),
              unconfirmed: true,
            });
          }
        }
      } catch (error: unknown) {
        console.error("Error loading mempool for recent transactions:", error);
      }
    }

    // Fetch enough recent blocks to cover offset+limit after the mempool prefix.
    const needed = offset + limit;
    const blocksToFetch = Math.min(
      MAX_BLOCKS_SCAN,
      Math.max(10, Math.ceil(needed / 2) + 5),
    );
    const blocks = await blockCache.getRecentBlocks(network, blocksToFetch, 0);

    const confirmed: RecentTransactionItem[] = [];
    for (const block of blocks) {
      const height = Number(block.height ?? 0);
      const time = Number(block.time ?? 0);
      const txids = Array.isArray(block.tx) ? (block.tx as string[]) : [];
      for (const txid of txids) {
        confirmed.push({
          txid,
          blockHeight: height,
          time,
          unconfirmed: false,
        });
      }
    }

    const combined = [...mempoolItems, ...confirmed];
    const page = combined.slice(offset, offset + limit);

    // Enrich only the page (not every scanned block's txs) with the total
    // output value so the list can show an amount. This feed only needs vout
    // totals, not input prevouts, so share a zero lookup budget across the page
    // to avoid multiplying parent-transaction RPC/cache lookups per item.
    const prevoutLookupBudget = { remaining: 0 };
    const enrichedPage = await Promise.all(
      page.map(async (item) => {
        try {
          const tx = await blockCache.getTransaction(
            item.txid,
            network,
            true,
            { prevoutLookupBudget },
          );
          const vout = (tx as { vout?: Array<{ value?: number }> }).vout;
          if (!Array.isArray(vout)) return item;
          const amount = vout.reduce(
            (sum, o) => sum + (Number(o.value) || 0),
            0,
          );
          return { ...item, amount };
        } catch {
          return item;
        }
      }),
    );

    const height = await blockCache.getBlockCount(network).catch(() => 0);

    res.json({
      transactions: enrichedPage,
      total: combined.length,
      offset,
      limit,
      height,
      network,
      hasMore: offset + limit < combined.length,
    });
  } catch (error: unknown) {
    handleRouteError(res, "Error fetching recent transactions", error);
  }
});

export default router;
