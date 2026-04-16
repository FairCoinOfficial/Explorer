import { createPublicClient, fallback, http } from 'viem'
import { base } from 'viem/chains'
import { WFAIR_CONFIG } from './wfair'

function createClient() {
  return createPublicClient({
    chain: base,
    transport: fallback(WFAIR_CONFIG.rpcUrls.map((url) => http(url))),
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
