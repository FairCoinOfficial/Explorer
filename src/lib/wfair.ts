export const WFAIR_CONFIG = {
  chainId: 8453,
  chainName: 'Base',
  address: '0xF2853CedDF47A05Fee0B4b24DFf2925d59737fb3' as const,
  deployedAt: '2026-04-16',
  basescanUrl: 'https://basescan.org/address/0xF2853CedDF47A05Fee0B4b24DFf2925d59737fb3',
  bridgeApiUrl: 'https://bridge.fairco.in/api/bridge/reserves',
  landingUrl: 'https://fairco.in/',
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
