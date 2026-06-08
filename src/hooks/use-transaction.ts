import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { useNetwork } from '@/contexts/network-context'

export interface TransactionScriptSig {
  asm: string
  hex: string
}

/**
 * The previous output an input spends, resolved server-side from the parent
 * transaction (see `enrichInputPrevouts` in server/lib/cache.ts). FairCoin's
 * `getrawtransaction verbose` does not include this on the input itself, so it is
 * absent whenever the parent transaction could not be resolved — consumers must
 * treat it as optional and degrade gracefully.
 */
export interface TransactionPrevout {
  value: number
  addresses?: string[]
  type?: string
}

export interface TransactionInput {
  /** Present on regular inputs; absent on the coinbase input. */
  txid?: string
  vout?: number
  scriptSig?: TransactionScriptSig
  /** Present only on the coinbase input of a generation transaction. */
  coinbase?: string
  sequence: number
  /** Resolved previous output (address + value). Absent if it could not be resolved. */
  prevout?: TransactionPrevout
}

export interface TransactionScriptPubKey {
  asm: string
  hex: string
  reqSigs?: number
  type: string
  addresses?: string[]
}

export interface TransactionOutput {
  value: number
  n: number
  scriptPubKey: TransactionScriptPubKey
}

export interface Transaction {
  txid: string
  version: number
  locktime: number
  size?: number
  vsize?: number
  weight?: number
  vin: TransactionInput[]
  vout: TransactionOutput[]
  hex: string
  blockhash?: string
  confirmations?: number
  time?: number
  blocktime?: number
}

interface TransactionResponse {
  transaction: Transaction
  network: string
}

/** An input is a coinbase (newly minted coins) when it carries the `coinbase` field. */
export function isCoinbaseInput(input: TransactionInput): boolean {
  return typeof input.coinbase === 'string'
}

/** All-zero outpoint hash used by coinbase-style inputs that reference no parent. */
const ZERO_HASH = '0000000000000000000000000000000000000000000000000000000000000000'

/**
 * How a transaction was classified, which drives the entire sent/change summary:
 *  - `coinbase`   — the block's generation tx (mints the block subsidy).
 *  - `coinstake`  — FairCoin (PIVX-based) Proof-of-Stake reward tx: the staker
 *                   pays themselves; there is no external recipient. Identified by
 *                   an empty first output (the PoS marker) on a non-coinbase tx.
 *  - `self`       — a normal tx where every external output returns to a sender
 *                   address (a self-send / consolidation): nothing left the wallet.
 *  - `standard`   — a normal transfer with at least one external recipient.
 */
export type TransactionKind = 'standard' | 'coinbase' | 'coinstake' | 'self'

/** One output tagged with whether it is the real recipient or change/reward. */
export interface ClassifiedOutput {
  output: TransactionOutput
  /**
   * `change`  — pays an address that also funded an input (returned to sender).
   * `reward`  — coinbase/coinstake payout to the miner/staker (no external send).
   * `recipient` — a genuine external recipient.
   * `marker`  — the empty PoS coinstake first output (value 0, no address).
   */
  role: 'recipient' | 'change' | 'reward' | 'marker'
}

export interface TransactionAnalysis {
  kind: TransactionKind
  /** Distinct addresses that funded the inputs (lowercased-safe, exact strings). */
  inputAddresses: Set<string>
  /** True when every non-coinbase input had a resolvable prevout address. */
  inputsResolved: boolean
  /** Sum of resolved input values, or null when inputs could not be resolved. */
  totalInput: number | null
  /** Sum of all output values. */
  totalOutput: number
  /** Fee = totalInput − totalOutput, or null when inputs are unresolved/coinbase. */
  fee: number | null
  /** Amount that actually left to external recipients (excludes change/reward). */
  sent: number
  /** Number of outputs classified as genuine external recipients. */
  recipientCount: number
  /** True when at least one output was identified as change via address match. */
  hasDetectedChange: boolean
  /**
   * Whether {@link sent} can be trusted as the exact amount that left the wallet.
   *
   * It is exact when there is no ambiguity about change:
   *  - change was positively detected (so the remainder is genuinely the send), or
   *  - there is exactly one recipient output and no change could exist to confuse it.
   *
   * It is NOT exact when inputs are resolved but there are multiple recipient
   * outputs and none matched an input address: one of them may be change to a
   * fresh address that the address heuristic cannot catch. Callers should then
   * present the total moved with a caveat rather than a precise "Sent".
   */
  sentIsExact: boolean
  /** Every output tagged with its role, preserving original order. */
  outputs: ClassifiedOutput[]
}

/** True when an output carries no value and no address — the PoS coinstake marker. */
function isEmptyMarkerOutput(output: TransactionOutput): boolean {
  const hasAddress = (output.scriptPubKey.addresses?.length ?? 0) > 0
  return output.value === 0 && !hasAddress
}

/**
 * Classify a transaction so the UI can clearly separate what was *sent* from
 * change returned to the sender, and label generation (coinbase/coinstake) txs
 * for what they are.
 *
 * Change detection heuristic
 * --------------------------
 * An output is treated as **change** when it pays an address that ALSO funded one
 * of this transaction's inputs (the coins are returning to a sender). This is the
 * standard, widely-used explorer heuristic, and it has real limits:
 *
 *  - It is a HEURISTIC, not ground truth. A wallet that sends change to a brand-new
 *    address (common HD-wallet behavior) defeats it: that output looks like a
 *    normal recipient. Conversely, paying an address you happen to also spend from
 *    can be mislabeled as change. We therefore present results as a best-effort
 *    aid, never as authoritative.
 *  - It requires the input addresses. FairCoin's RPC omits them on the input, so
 *    they are resolved server-side; if that resolution fails (parent tx
 *    unavailable), `inputsResolved` is false and we DO NOT guess — the caller
 *    falls back to the plain total-output display rather than mislabeling outputs.
 *
 * Coinbase / coinstake
 * --------------------
 * These legitimately have no external recipient. Their outputs are the block
 * reward paid to the miner/staker, so every payout is tagged `reward` (not
 * `change`) and `sent` is 0.
 */
export function analyzeTransaction(tx: Transaction): TransactionAnalysis {
  const totalOutput = tx.vout.reduce((sum, output) => sum + output.value, 0)

  const isCoinbase = tx.vin.some(isCoinbaseInput)

  // Spendable (non-coinbase) inputs that reference a real parent outpoint.
  const spendInputs = tx.vin.filter(
    (input) => !isCoinbaseInput(input) && input.txid && input.txid !== ZERO_HASH,
  )

  // Coinstake (PIVX/FairCoin PoS): a non-coinbase tx whose FIRST output is the
  // empty stake marker. The staker pays themselves; there is no external send.
  const isCoinstake =
    !isCoinbase && tx.vout.length > 0 && isEmptyMarkerOutput(tx.vout[0]) && spendInputs.length > 0

  // Gather input addresses and total from resolved prevouts. `inputsResolved` is
  // true only when every spendable input resolved an address, so a partial
  // resolution can't silently mislabel outputs as (non-)change.
  const inputAddresses = new Set<string>()
  let resolvedInputCount = 0
  let resolvedInputValue = 0
  let anyValueMissing = false
  for (const input of spendInputs) {
    const prevout = input.prevout
    if (!prevout) {
      anyValueMissing = true
      continue
    }
    resolvedInputValue += prevout.value
    const addresses = prevout.addresses ?? []
    if (addresses.length > 0) {
      resolvedInputCount += 1
      for (const address of addresses) inputAddresses.add(address)
    }
  }
  const inputsResolved = spendInputs.length > 0 && resolvedInputCount === spendInputs.length
  const totalInput = !anyValueMissing && spendInputs.length > 0 ? resolvedInputValue : null

  // Fee is only meaningful for ordinary spends with fully-resolved input values.
  // Coinbase/coinstake create coins (outputs ≥ inputs), so we don't report a fee.
  const fee =
    !isCoinbase && !isCoinstake && totalInput !== null
      ? Math.max(totalInput - totalOutput, 0)
      : null

  const outputs: ClassifiedOutput[] = tx.vout.map((output) => {
    if (isCoinbase || isCoinstake) {
      // The empty leading marker stays a marker; everything else is a reward payout.
      const role = isEmptyMarkerOutput(output) ? 'marker' : 'reward'
      return { output, role }
    }
    if (isEmptyMarkerOutput(output)) {
      return { output, role: 'marker' }
    }
    const address = output.scriptPubKey.addresses?.[0]
    // Only call something change when we actually resolved input addresses AND the
    // output address is among them; otherwise treat it as a recipient (no guessing).
    const isChange =
      inputsResolved && address !== undefined && inputAddresses.has(address)
    return { output, role: isChange ? 'change' : 'recipient' }
  })

  const recipientOutputs = outputs.filter((entry) => entry.role === 'recipient')
  const recipientCount = recipientOutputs.length
  const sent = recipientOutputs.reduce((sum, entry) => sum + entry.output.value, 0)
  const hasDetectedChange = outputs.some((entry) => entry.role === 'change')

  let kind: TransactionKind = 'standard'
  if (isCoinbase) kind = 'coinbase'
  else if (isCoinstake) kind = 'coinstake'
  else if (inputsResolved && recipientCount === 0) kind = 'self'

  // "Sent" is exact only when change is unambiguous: either we positively detected
  // change (the rest is the real send), or there is a single recipient and no
  // second output that could secretly be change to a fresh, unrecognized address.
  const sentIsExact =
    kind === 'self' || hasDetectedChange || (inputsResolved && recipientCount <= 1)

  return {
    kind,
    inputAddresses,
    inputsResolved,
    totalInput,
    totalOutput,
    fee,
    sent,
    recipientCount,
    hasDetectedChange,
    sentIsExact,
    outputs,
  }
}

export function useTransaction(txid: string): UseQueryResult<Transaction> {
  const { currentNetwork } = useNetwork()

  return useQuery<Transaction>({
    queryKey: ['transaction', txid, currentNetwork],
    queryFn: async (): Promise<Transaction> => {
      const response = await fetch(`/api/transaction/${txid}?network=${currentNetwork}`, {
        headers: { Accept: 'application/json' },
      })
      if (!response.ok) {
        const message = await readErrorMessage(response)
        throw new TransactionError(message, response.status)
      }
      const data = (await response.json()) as TransactionResponse
      return data.transaction
    },
    refetchInterval: 30_000,
    retry: 1,
  })
}

/** Error carrying the HTTP status so callers can disambiguate "not found" vs other failures. */
export class TransactionError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'TransactionError'
    this.status = status
  }
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string }
    if (body.error) return body.error
  } catch {
    // Fall through to the generic status-based message below.
  }
  return `Failed to load transaction (${response.status})`
}
