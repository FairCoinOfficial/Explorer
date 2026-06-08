/** WFAIR/USDC Uniswap V3 pool on Base (fee 0.3%); source of the live FAIR price. */
export const WFAIR_USDC_POOL_ADDRESS = '0x9F4F694390c60b51e30461c785C1345A1545b7ca' as const

export const WFAIR_CONFIG = {
  chainId: 8453,
  chainName: 'Base',
  address: '0xF2853CedDF47A05Fee0B4b24DFf2925d59737fb3' as const,
  deployedAt: '2026-04-16',
  basescanUrl: 'https://basescan.org/address/0xF2853CedDF47A05Fee0B4b24DFf2925d59737fb3',
  bridgeApiUrl: 'https://bridge.fairco.in/api/bridge/reserves',
  landingUrl: 'https://fairco.in/',
  buyUrl: 'https://buy.fairco.in/',
  /** Uniswap UI page for the WFAIR/USDC pool — where "View market" points. */
  poolUrl: `https://app.uniswap.org/explore/pools/base/${WFAIR_USDC_POOL_ADDRESS}`,
  repoUrl: 'https://github.com/FairCoinOfficial/faircoin-bridge',
  tokenListUrl: 'https://fairco.in/tokenlist.json',
  rpcUrls: [
    'https://mainnet.base.org',
    'https://base.llamarpc.com',
  ] as const,
} as const

export const WFAIR_ABI = [
  { type: 'function', name: 'totalSupply', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'paused', stateMutability: 'view', inputs: [], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'name', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'symbol', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'decimals', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
] as const
