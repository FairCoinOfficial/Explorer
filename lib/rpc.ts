// Only import server-only when running in Next.js environment
if (typeof window === 'undefined' && process.env.NODE_ENV !== 'test') {
  try {
    require('server-only');
  } catch {
    // Ignore if server-only is not available (e.g., in scripts)
  }
}

type RpcError = { code: number; message: string } | null;
type RpcEnvelope<T> = { result: T; error: RpcError; id: string | number | null };

export interface NetworkConfig {
  rpcUser: string;
  rpcPass: string;
  rpcHost: string;
  rpcPort: string;
  rpcScheme: string;
}

export type NetworkType = 'mainnet' | 'testnet';

// Default network configurations
const NETWORK_CONFIGS: Record<NetworkType, NetworkConfig> = {
  mainnet: {
    rpcUser: process.env.FAIRCOIN_RPC_USER || 'fair',
    rpcPass: process.env.FAIRCOIN_RPC_PASS || 'change_me',
    rpcHost: process.env.FAIRCOIN_RPC_HOST || 'seed1.fairco.in',
    rpcPort: process.env.FAIRCOIN_RPC_PORT || '40405',
    rpcScheme: process.env.FAIRCOIN_RPC_SCHEME || 'http',
  },
  testnet: {
    rpcUser: process.env.FAIRCOIN_TESTNET_RPC_USER || process.env.FAIRCOIN_RPC_USER || 'fair',
    rpcPass: process.env.FAIRCOIN_TESTNET_RPC_PASS || process.env.FAIRCOIN_RPC_PASS || 'change_me',
    rpcHost: process.env.FAIRCOIN_TESTNET_RPC_HOST || '127.0.0.1',
    rpcPort: process.env.FAIRCOIN_TESTNET_RPC_PORT || '18332',
    rpcScheme: process.env.FAIRCOIN_TESTNET_RPC_SCHEME || 'http',
  }
};

// Legacy exports for backward compatibility
const RPC_USER = process.env.FAIRCOIN_RPC_USER;
const RPC_PASS = process.env.FAIRCOIN_RPC_PASS;
const RPC_HOST = process.env.FAIRCOIN_RPC_HOST || '127.0.0.1';
const RPC_PORT = process.env.FAIRCOIN_RPC_PORT || '40405';
const RPC_SCHEME = process.env.FAIRCOIN_RPC_SCHEME || 'http';

if (!RPC_USER || !RPC_PASS) {
  // Intentionally avoid crashing at import time in Next.js, but provide clear error at call time.
  console.warn('[rpc] FAIRCOIN_RPC_USER / FAIRCOIN_RPC_PASS not set.');
}

// Create RPC client for specific network
export async function rpcWithNetwork<T>(method: string, params: any[] = [], network: NetworkType = 'mainnet'): Promise<T> {
  const config = NETWORK_CONFIGS[network];
  const auth = Buffer.from(`${config.rpcUser}:${config.rpcPass}`).toString('base64');
  const url = `${config.rpcScheme}://${config.rpcHost}:${config.rpcPort}/`;
  
  // Some minifiers may rewrite boolean literals to numeric 0/1 in compiled server bundles.
  // Different RPC implementations expect different types for flag params. For FairCoin
  // the RPC expects integers (1/0) for some flags (rather than booleans). Support both
  // behaviors explicitly by listing which param indexes should be treated as booleans
  // vs integers.
  const BOOL_PARAM_INDICES: { [key: string]: number[] } = {
    'getblock': [1], // verbose flag should be boolean
  };
  
  const INT_PARAM_INDICES: { [key: string]: number[] } = {
    'getrawtransaction': [1], // verbose flag should be integer  
  };

  const processedParams = params.map((param, index) => {
    if (BOOL_PARAM_INDICES[method]?.includes(index)) {
      return Boolean(param);
    }
    if (INT_PARAM_INDICES[method]?.includes(index)) {
      return Number(param);
    }
    return param;
  });

  const body = {
    jsonrpc: '2.0',
    method,
    params: processedParams,
    id: 'nextjs',
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`RPC HTTP ${response.status}: ${response.statusText}`);
  }

  const envelope: RpcEnvelope<T> = await response.json();
  if (envelope.error) {
    throw new Error(`RPC ${envelope.error.code}: ${envelope.error.message}`);
  }

  return envelope.result;
}

// Default RPC client (uses mainnet for backward compatibility)
export async function rpc<T>(method: string, params: any[] = []): Promise<T> {
  return rpcWithNetwork<T>(method, params, 'mainnet');
}

// Network-aware RPC functions
export const getBlockCount = (network: NetworkType = 'mainnet') => rpcWithNetwork<number>('getblockcount', [], network);
export const getBlockHash = (height: number, network: NetworkType = 'mainnet') => rpcWithNetwork<string>('getblockhash', [height], network);
export const getBlock = (hash: string, network: NetworkType = 'mainnet') => rpcWithNetwork<any>('getblock', [hash, true], network);
export const getRawTransactionVerbose = (txid: string, network: NetworkType = 'mainnet') => rpcWithNetwork<any>('getrawtransaction', [txid, 1], network);

// Legacy functions (default to mainnet)
export const getBlockCountMainnet = () => rpcWithNetwork<number>('getblockcount', [], 'mainnet');
export const getBlockHashMainnet = (height: number) => rpcWithNetwork<string>('getblockhash', [height], 'mainnet');
export const getBlockMainnet = (hash: string) => rpcWithNetwork<any>('getblock', [hash, true], 'mainnet');
export const getRawTransactionVerboseMainnet = (txid: string) => rpcWithNetwork<any>('getrawtransaction', [txid, 1], 'mainnet');
