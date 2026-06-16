// Non-custodial agent-wallet primitives for the FairCoin Explorer MCP server.
//
// This module implements the ONLY cryptography the explorer performs in-process:
// key generation, compressed public-key derivation, base58check address
// encoding, and WIF (Wallet Import Format) encode/decode. The elliptic-curve
// math is delegated to the vetted `@noble/curves` secp256k1 implementation; we
// never roll our own curve.
//
// Everything else (raw transaction construction, sighash, signing, broadcast)
// is delegated to the FairCoin daemon via JSON-RPC (`createrawtransaction`,
// `signrawtransaction`, `sendrawtransaction`) so FairCoin's exact transaction
// and sighash format is always correct.
//
// SECURITY: private keys handled here are NEVER persisted, logged, or echoed in
// error messages. The caller (an AI agent) is the sole holder of its key; the
// server stores nothing. Helpers that touch key material throw plain, key-free
// errors so a private key can never leak through an error surface.

import { randomBytes } from "crypto";
import { secp256k1 } from "@noble/curves/secp256k1";
import { sha256 } from "@noble/hashes/sha256";
import { ripemd160 } from "@noble/hashes/ripemd160";
import bs58check from "bs58check";
import type { NetworkType } from "@fairco.in/rpc-client";

/**
 * FairCoin base58check version bytes per network. These define the address
 * prefix letters (mainnet 'F', testnet 'T') and the WIF secret-key prefix.
 */
interface NetworkAddressParams {
  /** PUBKEY_ADDRESS version byte (P2PKH addresses). */
  readonly pubKeyHash: number;
  /** SCRIPT_ADDRESS version byte (P2SH addresses). */
  readonly scriptHash: number;
  /** SECRET_KEY / WIF version byte. */
  readonly wif: number;
}

const NETWORK_PARAMS: Record<NetworkType, NetworkAddressParams> = {
  // mainnet: addresses start with 'F'.
  mainnet: { pubKeyHash: 35, scriptHash: 16, wif: 163 },
  // testnet: addresses start with 'T'.
  testnet: { pubKeyHash: 65, scriptHash: 12, wif: 193 },
};

/** Length of a secp256k1 private key in bytes. */
const PRIVATE_KEY_LENGTH = 32;

/** Suffix byte appended to a WIF payload to mark a compressed public key. */
const WIF_COMPRESSION_FLAG = 0x01;

/**
 * Error raised for malformed wallet input (e.g. an unparsable WIF). Carries a
 * client-safe message and, crucially, NEVER includes key material — the caller
 * surfaces `.message` directly, so it must stay free of secrets.
 */
export class WalletError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WalletError";
  }
}

/** A freshly generated, in-memory keypair. Never persisted by the server. */
export interface GeneratedWallet {
  /** The base58check P2PKH address (mainnet 'F…', testnet 'T…'). */
  readonly address: string;
  /** The private key in WIF (compressed). The caller is its sole holder. */
  readonly wif: string;
}

/** Hash160 = RIPEMD160(SHA256(data)), the standard pay-to-pubkey-hash digest. */
function hash160(data: Uint8Array): Uint8Array {
  return ripemd160(sha256(data));
}

/** base58check-encode a version byte followed by a payload. */
function encodeBase58Check(version: number, payload: Uint8Array): string {
  const data = new Uint8Array(payload.length + 1);
  data[0] = version;
  data.set(payload, 1);
  return bs58check.encode(data);
}

/**
 * Derive the base58check P2PKH address for a compressed public key on the given
 * network: base58check( [PUBKEY_ADDRESS] + RIPEMD160(SHA256(pubkey)) ).
 */
export function addressFromPublicKey(publicKey: Uint8Array, network: NetworkType): string {
  return encodeBase58Check(NETWORK_PARAMS[network].pubKeyHash, hash160(publicKey));
}

/**
 * Encode a 32-byte private key as a compressed WIF for the given network:
 * base58check( [SECRET_KEY] + 32-byte key + 0x01 ).
 */
export function encodeWif(privateKey: Uint8Array, network: NetworkType): string {
  if (privateKey.length !== PRIVATE_KEY_LENGTH) {
    throw new WalletError("Invalid private key length.");
  }
  const payload = new Uint8Array(PRIVATE_KEY_LENGTH + 1);
  payload.set(privateKey, 0);
  payload[PRIVATE_KEY_LENGTH] = WIF_COMPRESSION_FLAG;
  return encodeBase58Check(NETWORK_PARAMS[network].wif, payload);
}

/** A WIF decoded into its private key plus the network it belongs to. */
export interface DecodedWif {
  readonly privateKey: Uint8Array;
  readonly network: NetworkType;
  readonly compressed: boolean;
}

/**
 * Decode a WIF string into its raw private key and originating network. The
 * version byte selects the network, so a key generated for testnet is rejected
 * if used against mainnet and vice versa. Throws a key-free {@link WalletError}
 * on any malformed input.
 */
export function decodeWif(wif: string): DecodedWif {
  let raw: Uint8Array;
  try {
    raw = bs58check.decode(wif);
  } catch {
    // bs58check errors can echo the input; never surface them.
    throw new WalletError("Invalid private key: not valid base58check WIF.");
  }

  if (raw.length < 1) {
    throw new WalletError("Invalid private key: empty WIF payload.");
  }

  const version = raw[0];
  const network = ((): NetworkType => {
    if (version === NETWORK_PARAMS.mainnet.wif) return "mainnet";
    if (version === NETWORK_PARAMS.testnet.wif) return "testnet";
    throw new WalletError("Invalid private key: unrecognized WIF version byte.");
  })();

  const body = raw.subarray(1);
  // Either a bare 32-byte key (uncompressed) or 32 bytes + 0x01 (compressed).
  if (body.length === PRIVATE_KEY_LENGTH) {
    return { privateKey: Uint8Array.from(body), network, compressed: false };
  }
  if (body.length === PRIVATE_KEY_LENGTH + 1 && body[PRIVATE_KEY_LENGTH] === WIF_COMPRESSION_FLAG) {
    return { privateKey: Uint8Array.from(body.subarray(0, PRIVATE_KEY_LENGTH)), network, compressed: true };
  }
  throw new WalletError("Invalid private key: unexpected WIF payload length.");
}

/**
 * Generate a fresh, cryptographically secure FairCoin keypair for the given
 * network. The private key comes from `crypto.randomBytes` and is validated to
 * lie in the secp256k1 range; the rare out-of-range draw is re-rolled.
 *
 * Returns the address and a compressed WIF. The server holds neither beyond the
 * lifetime of this call — it is returned to the caller and then discarded.
 */
export function generateWallet(network: NetworkType): GeneratedWallet {
  let privateKey = randomBytes(PRIVATE_KEY_LENGTH);
  // randomBytes can (astronomically rarely) produce a value >= curve order or 0.
  while (!secp256k1.utils.isValidPrivateKey(privateKey)) {
    privateKey = randomBytes(PRIVATE_KEY_LENGTH);
  }
  const publicKey = secp256k1.getPublicKey(privateKey, true);
  const address = addressFromPublicKey(publicKey, network);
  const wif = encodeWif(privateKey, network);
  return { address, wif };
}

/**
 * Derive the P2PKH address for a WIF on a target network. Verifies the WIF's
 * own network matches the requested network (so a testnet key cannot be spent
 * on mainnet by mistake), then derives the compressed-pubkey address. Throws a
 * key-free {@link WalletError} on mismatch or malformed input.
 */
export function addressFromWif(wif: string, network: NetworkType): string {
  const decoded = decodeWif(wif);
  if (decoded.network !== network) {
    throw new WalletError(
      `Private key is for ${decoded.network}, not ${network}. Use the matching network.`,
    );
  }
  const publicKey = secp256k1.getPublicKey(decoded.privateKey, decoded.compressed);
  return addressFromPublicKey(publicKey, network);
}
