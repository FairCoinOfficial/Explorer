import { createPublicClient, fallback, http } from 'viem'
import { base } from 'viem/chains'

/**
 * Server-side viem public client for Base L2.
 *
 * The frontend has its own client at `src/lib/base-client.ts`; the API server
 * needs an independent one (it cannot import browser code or the `@/` alias).
 * RPC endpoints mirror the frontend's `WFAIR_CONFIG.rpcUrls` — the public Base
 * endpoint first, then a community fallback — wrapped in viem's `fallback`
 * transport so a single unhealthy node never breaks a read.
 *
 * The client type is inferred via `ReturnType` rather than annotated as
 * `PublicClient`: viem's concrete client type is structurally narrower than the
 * bare `PublicClient` alias, so an explicit annotation triggers a spurious
 * "two different types with this name" error. Inference keeps it exact.
 */
export const BASE_RPC_URLS = [
  'https://mainnet.base.org',
  'https://base.llamarpc.com',
] as const

function createClient() {
  return createPublicClient({
    chain: base,
    transport: fallback(BASE_RPC_URLS.map((url) => http(url))),
  })
}

export type BasePublicClient = ReturnType<typeof createClient>

let cachedClient: BasePublicClient | null = null

export function getBasePublicClient(): BasePublicClient {
  if (!cachedClient) {
    cachedClient = createClient()
  }
  return cachedClient
}
