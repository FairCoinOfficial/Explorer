// Watch-only address derivation for the notification service.
//
// The wallet registers its account-level extended PUBLIC key (the xpub at
// m/44'/coinType'/0'); the server derives the receive (chain 0) and change
// (chain 1) P2PKH addresses from it. This is BIP32 public derivation only — no
// private key is ever produced, so a registered xpub can never sign or spend.
//
// Correctness is load-bearing: these addresses MUST be byte-identical to the
// ones FAIRWallet's KeyManager derives for the same xpub, or a payment the
// wallet can see would not be watched. To guarantee that, we reuse the SAME
// FairCoin primitives the wallet uses — `@fairco.in/core` network constants
// (BIP32 version bytes + P2PKH version byte) and `publicKeyToAddress`
// (base58check(pubKeyHash + hash160(pubkey))) — the single source of truth.

import { HDKey } from '@scure/bip32'
import { MAINNET, TESTNET, publicKeyToAddress, type NetworkConfig, type NetworkType } from '@fairco.in/core'

const NETWORKS: Record<NetworkType, NetworkConfig> = {
  mainnet: MAINNET,
  testnet: TESTNET,
}

/** BIP44 chain: 0 = external/receive, 1 = internal/change. */
export type Chain = 0 | 1

/** A derived address paired with its derivation index within a chain. */
export interface DerivedWindowEntry {
  index: number
  address: string
}

/**
 * Derive `count` contiguous P2PKH addresses for one BIP44 chain of an account
 * xpub, starting at `from`.
 *
 * @param xpub    Account-level extended PUBLIC key (m/44'/coinType'/0').
 * @param chain   0 for receive, 1 for change.
 * @param from    First derivation index (inclusive).
 * @param count   How many addresses to derive.
 * @param network Which FairCoin network the xpub belongs to; also selects the
 *                BIP32 version bytes used to parse it, so an xpub encoded for the
 *                other network is rejected.
 * @throws If the string is not a valid extended public key for `network`, if it
 *         carries private material (an xprv), or if a child pubkey cannot be
 *         derived.
 */
export function deriveWindow(
  xpub: string,
  chain: Chain,
  from: number,
  count: number,
  network: NetworkType,
): DerivedWindowEntry[] {
  const config = NETWORKS[network]

  let account: HDKey
  try {
    account = HDKey.fromExtendedKey(xpub.trim(), {
      public: config.bip32.public,
      private: config.bip32.private,
    })
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : 'unknown error'
    throw new Error(`Invalid extended public key for ${network}: ${detail}`)
  }

  // A watch-only key must hold no private material. Refuse an xprv rather than
  // silently retaining spend capability the server must never have.
  if (account.privateKey) {
    throw new Error('Expected an extended PUBLIC key (xpub) but got a private key')
  }

  const chainNode = account.deriveChild(chain)
  const entries: DerivedWindowEntry[] = []
  for (let index = from; index < from + count; index++) {
    const child = chainNode.deriveChild(index)
    if (!child.publicKey) {
      throw new Error(`Failed to derive public key at chain=${chain} index=${index}`)
    }
    entries.push({ index, address: publicKeyToAddress(child.publicKey, config) })
  }

  return entries
}
