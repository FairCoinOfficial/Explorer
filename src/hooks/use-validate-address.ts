import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { useNetwork } from '@/contexts/network-context'

/** Public, wallet-metadata-free result exposed by `/api/validate-address`. */
export interface NodeAddressValidation {
  isvalid: boolean
  address?: string
}

/**
 * Queries the node for an address. The query is disabled until `address` is a
 * non-empty submitted value, so it never fires on mount or on every keystroke —
 * the consumer flips `address` when the user presses "Validate".
 */
export function useValidateAddress(address: string): UseQueryResult<NodeAddressValidation> {
  const { currentNetwork } = useNetwork()
  const trimmed = address.trim()

  return useQuery<NodeAddressValidation>({
    queryKey: ['validate-address', trimmed, currentNetwork],
    enabled: trimmed.length > 0,
    queryFn: async (): Promise<NodeAddressValidation> => {
      const response = await fetch(
        `/api/validate-address?address=${encodeURIComponent(trimmed)}&network=${currentNetwork}`,
        { headers: { Accept: 'application/json' } },
      )
      if (!response.ok) {
        throw new Error(`Failed to validate address (${response.status})`)
      }
      return (await response.json()) as NodeAddressValidation
    },
    staleTime: 30_000,
    retry: 1,
  })
}
