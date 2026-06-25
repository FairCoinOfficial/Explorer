export interface PublicNetworkInfo {
  version?: number
  subversion?: string
  protocolversion?: number
  connections?: number
  relayfee?: number
}

function pickNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function pickString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

export function toPublicNetworkInfo(networkInfo: unknown): PublicNetworkInfo {
  if (!networkInfo || typeof networkInfo !== 'object') {
    return {}
  }

  const info = networkInfo as Record<string, unknown>

  return {
    version: pickNumber(info.version),
    subversion: pickString(info.subversion),
    protocolversion: pickNumber(info.protocolversion),
    connections: pickNumber(info.connections),
    relayfee: pickNumber(info.relayfee),
  }
}
