import { describe, expect, it } from 'vitest'
import { toPublicNetworkInfo } from './network-info'

describe('toPublicNetworkInfo', () => {
  it('returns only the public fields consumed by the frontend', () => {
    const publicInfo = toPublicNetworkInfo({
      version: 3000000,
      subversion: '/FairCoin:3.0.0/',
      protocolversion: 70015,
      connections: 8,
      relayfee: 0.001,
      networks: [{ name: 'ipv4', proxy: 'socks5://10.0.0.5:9050' }],
      localaddresses: [{ address: '203.0.113.7', port: 40404 }],
      localrelay: true,
      timeoffset: 0,
      warnings: 'backend warning text',
    })

    expect(publicInfo).toEqual({
      version: 3000000,
      subversion: '/FairCoin:3.0.0/',
      protocolversion: 70015,
      connections: 8,
      relayfee: 0.001,
    })
    expect(publicInfo).not.toHaveProperty('networks')
    expect(publicInfo).not.toHaveProperty('localaddresses')
    expect(publicInfo).not.toHaveProperty('warnings')
  })

  it('ignores malformed field values', () => {
    expect(toPublicNetworkInfo({ version: '3000000', connections: Number.NaN })).toEqual({
      version: undefined,
      subversion: undefined,
      protocolversion: undefined,
      connections: undefined,
      relayfee: undefined,
    })
  })
})
