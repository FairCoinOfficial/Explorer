import { describe, it, expect } from 'vitest'
import { deriveWindow } from './derive'

// Fixed account xpubs (m/44'/coinType'/0') and their derived P2PKH addresses,
// produced by the FAIRWallet KeyManager for the BIP39 test mnemonic
// "abandon abandon abandon abandon abandon abandon abandon abandon abandon
//  abandon abandon about". These vectors are the wallet's own output — the
// Explorer MUST derive byte-identical addresses so a payment the wallet can see
// is a payment the notification service watches.
const MAINNET_XPUB =
  'ToEA6m5JcxaE72JyzLAvHoonWB3GgAxzt5jADQC9Pc43q4V3omj94DdKe98KkRgY2nqwbNHxWCceM3o62VhFVe7HCnAW7yBGEvfbfwrYsK3N7t7'
const TESTNET_XPUB =
  'DRKVrRqVwgE2Eir1qeGNgWGuFi7adRMfXEEpevPzSWLd2qvr415hDdAyYXWk3xoEoT5Dg88jjaSeorgG7YTYFoLBioNu9zf7fu6URcdZYhxM3Buu'

describe('deriveWindow', () => {
  it('derives the FairCoin P2PKH receive address the wallet produces (mainnet)', () => {
    const [first] = deriveWindow(MAINNET_XPUB, 0, 0, 1, 'mainnet')
    expect(first).toEqual({ index: 0, address: 'FQVANvQqVsLwkwBnAJ5oPDYrqcfXLak7Bf' })
  })

  it('derives the receive chain matching the wallet across indices (mainnet)', () => {
    const window = deriveWindow(MAINNET_XPUB, 0, 0, 2, 'mainnet')
    expect(window).toEqual([
      { index: 0, address: 'FQVANvQqVsLwkwBnAJ5oPDYrqcfXLak7Bf' },
      { index: 1, address: 'F8Xe2DS7EwmU7CdyNokYmMYq6DqKnEEyRf' },
    ])
  })

  it('derives the change chain (chain 1) matching the wallet (mainnet)', () => {
    const [first] = deriveWindow(MAINNET_XPUB, 1, 0, 1, 'mainnet')
    expect(first).toEqual({ index: 0, address: 'F7zXLaTc8Ye6bmXaAJDB1WDM2aRmzmQhg3' })
  })

  it('derives a contiguous window at an arbitrary offset', () => {
    const window = deriveWindow(MAINNET_XPUB, 1, 5, 3, 'mainnet')
    expect(window.map((entry) => entry.index)).toEqual([5, 6, 7])
    // Addresses are non-empty base58 strings beginning with the mainnet prefix.
    for (const entry of window) {
      expect(entry.address.startsWith('F')).toBe(true)
    }
  })

  it('derives the FairCoin P2PKH receive address the wallet produces (testnet)', () => {
    const [first] = deriveWindow(TESTNET_XPUB, 0, 0, 1, 'testnet')
    expect(first).toEqual({ index: 0, address: 'TFGpQZB4EjXpVNT4gvPqzTFCwSAyjGe1MX' })
  })

  it('returns an empty array when count is zero', () => {
    expect(deriveWindow(MAINNET_XPUB, 0, 0, 0, 'mainnet')).toEqual([])
  })

  it('rejects a malformed extended key', () => {
    expect(() => deriveWindow('not-a-valid-xpub', 0, 0, 1, 'mainnet')).toThrow()
  })

  it('rejects an xpub encoded for the other network', () => {
    // A testnet xpub parsed under mainnet version bytes must be refused.
    expect(() => deriveWindow(TESTNET_XPUB, 0, 0, 1, 'mainnet')).toThrow()
  })
})
