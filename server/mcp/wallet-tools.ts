// Non-custodial agent-wallet MCP tools: create / balance / send / sweep.
//
// These let an AI agent hold its OWN FairCoin key and transact autonomously on
// mainnet or testnet. The server is strictly non-custodial:
//   - `create_wallet` generates a keypair in-process and RETURNS it; nothing is
//     stored (no DB, no file, no in-memory cache).
//   - `send`/`sweep` accept the agent's WIF as a parameter, derive the from
//     address, gather UTXOs via the node, build the raw transaction, and sign it
//     by handing the privkey to the node's `signrawtransaction` (which signs
//     WITHOUT importing the key to the wallet). The key is used transiently and
//     never retained.
//
// SECURITY (non-negotiable): the private key is NEVER logged, echoed in an error
// message, or persisted. Errors thrown here carry only key-free messages, and
// the surrounding tool wrapper logs the sanitized error context — never the tool
// arguments — so a key cannot leak through any error surface.

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { rpcWithNetwork, type NetworkType, type RpcParam } from "@fairco.in/rpc-client";
import { parseNetwork, ValidationError } from "../lib/http";
import { logger } from "../lib/logger";
import { addressFromWif, generateWallet, WalletError } from "./wallet";

/** Satoshis per FAIR (matches the rest of the explorer). */
const SATS_PER_FAIR = 100_000_000;

/**
 * Flat network fee, in satoshis (0.001 FAIR). FairCoin's minimum relay fee is
 * small and its transactions are compact, so a flat 0.001 FAIR comfortably
 * covers a typical few-input payment. This is intentionally simple and is
 * documented in the tool descriptions and README so callers know what to expect.
 */
const FLAT_FEE_SATS = 100_000;

/**
 * Outputs below this many satoshis are treated as dust and dropped (a change
 * output smaller than this is not worth creating; its value is added to the fee
 * instead). 0.0001 FAIR.
 */
const DUST_THRESHOLD_SATS = 10_000;

const networkArg = {
  network: z
    .enum(["mainnet", "testnet"])
    .optional()
    .describe('FairCoin network. Defaults to "mainnet".'),
};

const wifSchema = z
  .string()
  .min(1)
  .describe("The wallet's private key in WIF (compressed). Held only by you; the server stores nothing.");

const addressSchema = z
  .string()
  .min(1)
  .regex(
    /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{25,62}$/,
    "Invalid FairCoin address format.",
  )
  .describe("Destination FairCoin address (base58).");

/** A `getaddressutxos` entry from a node started with `-addressindex=1`. */
interface AddressUtxo {
  txid: string;
  outputIndex: number;
  script: string;
  satoshis: number;
  height: number;
}

/** A `getaddressbalance` result, in satoshis. */
interface AddressBalance {
  balance: number;
  received: number;
}

/** A `signrawtransaction` result. */
interface SignResult {
  hex?: string;
  complete?: boolean;
}

/**
 * Pretty-printed JSON content plus structured content (the MCP result shape).
 */
function jsonResult(data: Record<string, unknown>) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    structuredContent: data,
  };
}

/**
 * Sanitized tool error. A {@link ValidationError} or {@link WalletError} is a
 * pre-vetted, key-free, caller-facing message and is surfaced verbatim. Any
 * other error is logged server-side WITHOUT the tool arguments (which contain
 * the private key) and replaced with a generic message.
 */
function errorResult(context: string, error: unknown) {
  if (error instanceof ValidationError || error instanceof WalletError) {
    return { content: [{ type: "text" as const, text: error.message }], isError: true as const };
  }
  // Log only the context, never the error object's full payload or the args —
  // an RPC error message could conceivably echo request fields. Keep it generic.
  logger.error(`MCP ${context} failed (sanitized; private key never logged).`);
  return {
    content: [
      {
        type: "text" as const,
        text: `${context}. The operation could not be completed. The private key is never logged or stored.`,
      },
    ],
    isError: true as const,
  };
}

/** Convert a satoshi integer to a FAIR decimal string with 8 places. */
function satsToFairString(sats: number): string {
  const negative = sats < 0;
  const abs = Math.abs(sats);
  const whole = Math.floor(abs / SATS_PER_FAIR);
  const frac = (abs % SATS_PER_FAIR).toString().padStart(8, "0");
  return `${negative ? "-" : ""}${whole}.${frac}`;
}

/** Convert a FAIR amount (number) to integer satoshis, rejecting bad precision. */
function fairToSats(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ValidationError("Amount must be a positive number of FAIR.");
  }
  const sats = Math.round(amount * SATS_PER_FAIR);
  // Guard against float drift introducing sub-satoshi precision.
  if (Math.abs(amount * SATS_PER_FAIR - sats) > 1e-3) {
    throw new ValidationError("Amount has more precision than 8 decimal places.");
  }
  if (sats <= 0) {
    throw new ValidationError("Amount must be at least 1 satoshi (0.00000001 FAIR).");
  }
  return sats;
}

/** Fetch the spendable UTXOs for an address; clear error if addressindex is off. */
async function getUtxos(address: string, network: NetworkType): Promise<AddressUtxo[]> {
  let utxos: AddressUtxo[] | null;
  try {
    utxos = await rpcWithNetwork<AddressUtxo[]>("getaddressutxos", [{ addresses: [address] }], network);
  } catch {
    throw new WalletError(
      "Could not read UTXOs. The node may not have addressindex enabled, or it is unreachable.",
    );
  }
  if (!Array.isArray(utxos)) {
    throw new WalletError("Unexpected UTXO response from the node.");
  }
  return utxos;
}

/**
 * Build, sign, and broadcast a payment from `fromAddress` (owned by `wif`) to
 * `toAddress`. When `sendAll` is true the entire balance (minus fee) is sent and
 * `amountSats` is ignored. Returns the txid plus the final amount/fee/change.
 *
 * Transaction construction and signing are delegated to the node so FairCoin's
 * exact format is always correct: `createrawtransaction` builds it,
 * `signrawtransaction` signs it with the provided privkey (no wallet import),
 * and `sendrawtransaction` broadcasts it.
 */
async function buildSignBroadcast(
  wif: string,
  fromAddress: string,
  toAddress: string,
  network: NetworkType,
  options: { sendAll: boolean; amountSats: number },
): Promise<{ txid: string; amount: number; fee: number; change: number }> {
  const utxos = await getUtxos(fromAddress, network);
  if (utxos.length === 0) {
    throw new WalletError("No spendable funds: the from-address has no UTXOs.");
  }

  const totalSats = utxos.reduce((sum, u) => sum + (Number.isFinite(u.satoshis) ? u.satoshis : 0), 0);

  // Determine the send amount and the inputs to use.
  let amountSats: number;
  let selected: AddressUtxo[];
  if (options.sendAll) {
    selected = utxos;
    amountSats = totalSats - FLAT_FEE_SATS;
    if (amountSats <= 0) {
      throw new WalletError("Balance is too low to cover the network fee.");
    }
  } else {
    amountSats = options.amountSats;
    // Greedy selection: take UTXOs until amount + fee is covered.
    selected = [];
    let inputSats = 0;
    for (const u of utxos) {
      selected.push(u);
      inputSats += u.satoshis;
      if (inputSats >= amountSats + FLAT_FEE_SATS) break;
    }
    if (inputSats < amountSats + FLAT_FEE_SATS) {
      throw new WalletError("Insufficient funds to cover the amount plus the network fee.");
    }
  }

  const inputSats = selected.reduce((sum, u) => sum + u.satoshis, 0);
  const changeSats = inputSats - amountSats - FLAT_FEE_SATS;

  // RPC inputs: [{ txid, vout }, …].
  const rpcInputs: RpcParam[] = selected.map((u) => ({ txid: u.txid, vout: u.outputIndex }));

  // RPC outputs: { address: amountFair, … }. Drop dust change into the fee.
  const outputs: Record<string, RpcParam> = { [toAddress]: Number(satsToFairString(amountSats)) };
  let finalFeeSats = FLAT_FEE_SATS;
  if (changeSats > DUST_THRESHOLD_SATS) {
    outputs[fromAddress] = Number(satsToFairString(changeSats));
  } else if (changeSats > 0) {
    // Sub-dust change is uneconomical to create; let it go to the miner as fee.
    finalFeeSats = FLAT_FEE_SATS + changeSats;
  }

  let rawHex: string;
  try {
    rawHex = await rpcWithNetwork<string>("createrawtransaction", [rpcInputs, outputs], network);
  } catch {
    throw new WalletError("The node could not build the raw transaction.");
  }

  // prevtxs let the node sign without owning the inputs.
  const prevtxs: RpcParam[] = selected.map((u) => ({
    txid: u.txid,
    vout: u.outputIndex,
    scriptPubKey: u.script,
    amount: Number(satsToFairString(u.satoshis)),
  }));

  let signed: SignResult;
  try {
    signed = await rpcWithNetwork<SignResult>("signrawtransaction", [rawHex, prevtxs, [wif]], network);
  } catch {
    // Never echo the underlying error — it could include request fields.
    throw new WalletError("The node could not sign the transaction with the provided key.");
  }

  if (!signed || signed.complete !== true || typeof signed.hex !== "string") {
    throw new WalletError("Signing did not complete. The private key may not control these inputs.");
  }

  let txid: string;
  try {
    txid = await rpcWithNetwork<string>("sendrawtransaction", [signed.hex], network);
  } catch {
    throw new WalletError("The node rejected the transaction during broadcast.");
  }

  return {
    txid,
    amount: amountSats / SATS_PER_FAIR,
    fee: finalFeeSats / SATS_PER_FAIR,
    change: Math.max(0, changeSats > DUST_THRESHOLD_SATS ? changeSats : 0) / SATS_PER_FAIR,
  };
}

/**
 * Register the four non-custodial agent-wallet tools on the MCP server.
 */
export function registerWalletTools(server: McpServer): void {
  // ---- create_wallet ----

  server.registerTool(
    "create_wallet",
    {
      title: "Create a FairCoin wallet (non-custodial)",
      description:
        "Generate a brand-new FairCoin keypair for the given network and return the address and private key (WIF). The server stores NOTHING — you are the sole holder of the key. Store it securely; it cannot be recovered.",
      inputSchema: { ...networkArg },
    },
    async ({ network }) => {
      try {
        const net = parseNetwork(network);
        const wallet = generateWallet(net);
        return jsonResult({
          network: net,
          address: wallet.address,
          privateKey: wallet.wif,
          note: "Store this private key securely. The server does not keep a copy and cannot recover it. Anyone with this key controls the funds.",
        });
      } catch (error) {
        return errorResult("create_wallet", error);
      }
    },
  );

  // ---- get_balance ----

  server.registerTool(
    "get_balance",
    {
      title: "Get a FairCoin address balance",
      description:
        "Return the confirmed + unconfirmed balance and UTXO count for an address via getaddressbalance/getaddressutxos. Requires a node with addressindex enabled; returns a clear error otherwise.",
      inputSchema: {
        address: addressSchema,
        ...networkArg,
      },
    },
    async ({ address, network }) => {
      try {
        const net = parseNetwork(network);
        const trimmed = address.trim();

        let balance: AddressBalance | null;
        try {
          balance = await rpcWithNetwork<AddressBalance>(
            "getaddressbalance",
            [{ addresses: [trimmed] }],
            net,
          );
        } catch {
          throw new WalletError(
            "Could not read the balance. The node may not have addressindex enabled, or it is unreachable.",
          );
        }

        const utxos = await getUtxos(trimmed, net);
        const balanceSats = typeof balance?.balance === "number" ? balance.balance : 0;
        const receivedSats = typeof balance?.received === "number" ? balance.received : 0;
        const utxoSats = utxos.reduce((sum, u) => sum + (Number.isFinite(u.satoshis) ? u.satoshis : 0), 0);
        // Unconfirmed = spendable UTXO total minus the confirmed balance (>= 0).
        const unconfirmedSats = Math.max(0, utxoSats - balanceSats);

        return jsonResult({
          address: trimmed,
          network: net,
          confirmed: balanceSats / SATS_PER_FAIR,
          confirmedSat: balanceSats,
          unconfirmed: unconfirmedSats / SATS_PER_FAIR,
          unconfirmedSat: unconfirmedSats,
          totalReceived: receivedSats / SATS_PER_FAIR,
          totalReceivedSat: receivedSats,
          utxoCount: utxos.length,
        });
      } catch (error) {
        return errorResult("get_balance", error);
      }
    },
  );

  // ---- send ----

  server.registerTool(
    "send",
    {
      title: "Send FAIR (non-custodial)",
      description:
        "Send a FAIR amount from the address controlled by your private key (WIF) to a destination address. Inputs are selected to cover the amount plus a flat 0.001 FAIR fee; change returns to your address (dust change is dropped into the fee). The transaction is built and signed by the node (your key is used transiently, never imported or stored). Returns { txid, amount, fee }.",
      inputSchema: {
        privateKey: wifSchema,
        toAddress: addressSchema,
        amount: z.number().positive().describe("Amount of FAIR to send (max 8 decimal places)."),
        ...networkArg,
      },
    },
    async ({ privateKey, toAddress, amount, network }) => {
      try {
        const net = parseNetwork(network);
        const amountSats = fairToSats(amount);
        const fromAddress = addressFromWif(privateKey.trim(), net);
        const dest = toAddress.trim();
        const result = await buildSignBroadcast(privateKey.trim(), fromAddress, dest, net, {
          sendAll: false,
          amountSats,
        });
        return jsonResult({
          network: net,
          from: fromAddress,
          to: dest,
          txid: result.txid,
          amount: result.amount,
          fee: result.fee,
          change: result.change,
        });
      } catch (error) {
        return errorResult("send", error);
      }
    },
  );

  // ---- sweep ----

  server.registerTool(
    "sweep",
    {
      title: "Sweep an entire FairCoin balance (non-custodial)",
      description:
        "Send the ENTIRE balance of the address controlled by your private key (WIF) to a destination address, minus a flat 0.001 FAIR fee. Built and signed by the node (your key is used transiently, never imported or stored). Returns { txid, amount, fee }.",
      inputSchema: {
        privateKey: wifSchema,
        toAddress: addressSchema,
        ...networkArg,
      },
    },
    async ({ privateKey, toAddress, network }) => {
      try {
        const net = parseNetwork(network);
        const fromAddress = addressFromWif(privateKey.trim(), net);
        const dest = toAddress.trim();
        const result = await buildSignBroadcast(privateKey.trim(), fromAddress, dest, net, {
          sendAll: true,
          amountSats: 0,
        });
        return jsonResult({
          network: net,
          from: fromAddress,
          to: dest,
          txid: result.txid,
          amount: result.amount,
          fee: result.fee,
        });
      } catch (error) {
        return errorResult("sweep", error);
      }
    },
  );
}
