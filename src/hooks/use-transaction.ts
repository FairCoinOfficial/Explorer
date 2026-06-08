import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { useNetwork } from '@/contexts/network-context'

export interface TransactionScriptSig {
  asm: string
  hex: string
}

export interface TransactionInput {
  /** Present on regular inputs; absent on the coinbase input. */
  txid?: string
  vout?: number
  scriptSig?: TransactionScriptSig
  /** Present only on the coinbase input of a generation transaction. */
  coinbase?: string
  sequence: number
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
