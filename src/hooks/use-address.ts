import { useQuery, keepPreviousData, type UseQueryResult } from '@tanstack/react-query'
import { useNetwork } from '@/contexts/network-context'

export interface AddressTransaction {
  txid: string
  time: number
  confirmations: number
  amount: number
  type: 'received' | 'sent'
  blockHeight?: number | null
}

export interface AddressUtxo {
  txid: string
  vout: number
  value: number
}

export interface AddressInfo {
  address: string
  balance: number
  balanceSat?: number
  totalReceived: number
  totalReceivedSat?: number
  totalSent: number
  totalSentSat?: number
  txCount: number
  utxos?: AddressUtxo[]
  /** Present only when the node exposes a full transaction index. */
  transactions?: AddressTransaction[]
  isValid?: boolean
  /** Set by the API when the node lacks addressindex, limiting available data. */
  note?: string
}

interface AddressResponse {
  addressInfo: AddressInfo
  network: string
}

export function useAddress(address: string): UseQueryResult<AddressInfo> {
  const { currentNetwork } = useNetwork()

  return useQuery<AddressInfo>({
    queryKey: ['address', address, currentNetwork],
    queryFn: async (): Promise<AddressInfo> => {
      const response = await fetch(`/api/address/${address}?network=${currentNetwork}`, {
        headers: { Accept: 'application/json' },
      })
      if (!response.ok) {
        throw new Error(await readErrorMessage(response))
      }
      const data = (await response.json()) as AddressResponse
      return data.addressInfo
    },
    refetchInterval: 30_000,
    retry: 1,
  })
}

export interface AddressTxsPage {
  transactions: AddressTransaction[]
  page: number
  limit: number
  total: number
  /** Set by the API when the node lacks addressindex, limiting available data. */
  note?: string
}

/**
 * Paginated transaction history for an address, served by
 * `/api/address/:address/txs`. The server computes the address-relative net
 * `amount` and `type` ('received' | 'sent') from enriched prevouts.
 */
export function useAddressTransactions(
  address: string,
  page: number,
  limit = 20,
): UseQueryResult<AddressTxsPage> {
  const { currentNetwork } = useNetwork()

  return useQuery<AddressTxsPage>({
    queryKey: ['address-txs', address, page, limit, currentNetwork],
    queryFn: async (): Promise<AddressTxsPage> => {
      const response = await fetch(
        `/api/address/${address}/txs?page=${page}&limit=${limit}&network=${currentNetwork}`,
        { headers: { Accept: 'application/json' } },
      )
      if (!response.ok) {
        throw new Error(await readErrorMessage(response))
      }
      return (await response.json()) as AddressTxsPage
    },
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
    retry: 1,
  })
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string }
    if (body.error) return body.error
  } catch {
    // Fall through to the generic status-based message below.
  }
  return `Failed to load address (${response.status})`
}
