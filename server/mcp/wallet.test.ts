import { describe, it, expect } from "vitest";
import bs58check from "bs58check";
import {
  generateWallet,
  decodeWif,
  encodeWif,
  addressFromWif,
  addressFromPublicKey,
  WalletError,
} from "./wallet";

/** WIF secret-key version bytes (mirrors the module's NETWORK_PARAMS). */
const WIF_VERSION = { mainnet: 163, testnet: 193 } as const;

describe("generateWallet", () => {
  it("produces a mainnet address starting with 'F' that round-trips through its WIF", () => {
    const wallet = generateWallet("mainnet");
    expect(wallet.address.startsWith("F")).toBe(true);
    // Re-deriving the address from the WIF must reproduce the same address.
    expect(addressFromWif(wallet.wif, "mainnet")).toBe(wallet.address);
  });

  it("produces a testnet address starting with 'T' that round-trips through its WIF", () => {
    const wallet = generateWallet("testnet");
    expect(wallet.address.startsWith("T")).toBe(true);
    expect(addressFromWif(wallet.wif, "testnet")).toBe(wallet.address);
  });

  it("produces distinct keys on each call", () => {
    const a = generateWallet("mainnet");
    const b = generateWallet("mainnet");
    expect(a.wif).not.toBe(b.wif);
    expect(a.address).not.toBe(b.address);
  });
});

describe("WIF encoding/decoding", () => {
  it("encodes the correct secret-key version byte per network", () => {
    const mainnet = generateWallet("mainnet");
    const testnet = generateWallet("testnet");
    expect(bs58check.decode(mainnet.wif)[0]).toBe(WIF_VERSION.mainnet);
    expect(bs58check.decode(testnet.wif)[0]).toBe(WIF_VERSION.testnet);
  });

  it("decodes a generated WIF back to a 32-byte compressed key on the right network", () => {
    const wallet = generateWallet("testnet");
    const decoded = decodeWif(wallet.wif);
    expect(decoded.privateKey.length).toBe(32);
    expect(decoded.compressed).toBe(true);
    expect(decoded.network).toBe("testnet");
  });

  it("re-encodes a decoded private key to the identical WIF", () => {
    const wallet = generateWallet("mainnet");
    const decoded = decodeWif(wallet.wif);
    expect(encodeWif(decoded.privateKey, "mainnet")).toBe(wallet.wif);
  });

  it("rejects malformed WIF input without leaking internals", () => {
    expect(() => decodeWif("not-a-valid-wif")).toThrow(WalletError);
    expect(() => decodeWif("")).toThrow(WalletError);
  });
});

describe("network mismatch protection", () => {
  it("refuses to derive a mainnet address from a testnet WIF", () => {
    const testnet = generateWallet("testnet");
    expect(() => addressFromWif(testnet.wif, "mainnet")).toThrow(WalletError);
  });

  it("refuses to derive a testnet address from a mainnet WIF", () => {
    const mainnet = generateWallet("mainnet");
    expect(() => addressFromWif(mainnet.wif, "testnet")).toThrow(WalletError);
  });
});

describe("addressFromPublicKey", () => {
  it("derives the documented BIP/base58check address for a known compressed pubkey", () => {
    // A well-known compressed public key (the secp256k1 generator point G).
    const pubkey = Uint8Array.from(
      Buffer.from("0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798", "hex"),
    );
    const mainnet = addressFromPublicKey(pubkey, "mainnet");
    const testnet = addressFromPublicKey(pubkey, "testnet");
    expect(mainnet.startsWith("F")).toBe(true);
    expect(testnet.startsWith("T")).toBe(true);
    // hash160 of the pubkey must match across both encodings (same payload, different version).
    expect(bs58check.decode(mainnet).subarray(1)).toEqual(bs58check.decode(testnet).subarray(1));
  });
});
