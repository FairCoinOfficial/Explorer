import { describe, it, expect } from 'vitest'
import {
  parseNetwork,
  parseLimit,
  parseOffset,
  parseBlockOffset,
  parseAddress,
  escapeRegex,
  ValidationError,
  MIN_LIMIT,
  MAX_LIMIT,
  MAX_BLOCK_OFFSET,
} from './http'

describe('parseNetwork', () => {
  it('defaults to mainnet when absent', () => {
    expect(parseNetwork(undefined)).toBe('mainnet')
    expect(parseNetwork(null)).toBe('mainnet')
    expect(parseNetwork('')).toBe('mainnet')
  })

  it('accepts the two supported networks', () => {
    expect(parseNetwork('mainnet')).toBe('mainnet')
    expect(parseNetwork('testnet')).toBe('testnet')
  })

  it('rejects unknown values', () => {
    expect(() => parseNetwork('regtest')).toThrow(ValidationError)
    expect(() => parseNetwork('mainnet; DROP TABLE')).toThrow(ValidationError)
    expect(() => parseNetwork(42)).toThrow(ValidationError)
  })
})

describe('parseLimit', () => {
  it('returns the default when absent or unparseable', () => {
    expect(parseLimit(undefined)).toBeGreaterThanOrEqual(MIN_LIMIT)
    expect(parseLimit('not a number')).toBeGreaterThanOrEqual(MIN_LIMIT)
  })

  it('clamps to the allowed range instead of throwing', () => {
    expect(parseLimit('99999')).toBe(MAX_LIMIT)
    expect(parseLimit('-5')).toBe(MIN_LIMIT)
    expect(parseLimit('25')).toBe(25)
  })
})

describe('parseOffset', () => {
  it('returns 0 when absent or unparseable', () => {
    expect(parseOffset(undefined)).toBe(0)
    expect(parseOffset('foo')).toBe(0)
  })

  it('clamps negatives to 0 and accepts large values', () => {
    expect(parseOffset('-10')).toBe(0)
    expect(parseOffset('1000000')).toBe(1_000_000)
  })
})

describe('parseBlockOffset', () => {
  it('bounds public block pagination offsets', () => {
    expect(parseBlockOffset('-10')).toBe(0)
    expect(parseBlockOffset('25')).toBe(25)
    expect(parseBlockOffset(String(MAX_BLOCK_OFFSET + 1))).toBe(MAX_BLOCK_OFFSET)
  })
})

describe('parseAddress', () => {
  // A 34-char base58 address (valid shape).
  const validAddress = 'fVALIDADDRESSEEEEEEEEEEEEEEEEEEEEEE'.replace(/0|O|I|l/g, 'a')

  it('accepts well-formed base58 addresses', () => {
    expect(parseAddress(validAddress)).toBe(validAddress)
  })

  it('rejects addresses that are too short or too long', () => {
    expect(() => parseAddress('short')).toThrow(ValidationError)
    expect(() => parseAddress('a'.repeat(100))).toThrow(ValidationError)
  })

  it('rejects characters outside the base58 alphabet', () => {
    // '0' is not in base58.
    expect(() => parseAddress('0' + validAddress.slice(1))).toThrow(ValidationError)
    // SQL/regex injection attempts.
    expect(() => parseAddress('abc; DROP TABLE users;')).toThrow(ValidationError)
    expect(() => parseAddress(validAddress + '/../')).toThrow(ValidationError)
  })

  it('rejects non-string input', () => {
    expect(() => parseAddress(undefined)).toThrow(ValidationError)
    expect(() => parseAddress(42 as unknown)).toThrow(ValidationError)
  })
})

describe('escapeRegex', () => {
  it('escapes every regex metacharacter', () => {
    expect(escapeRegex('a.b*c+d?')).toBe('a\\.b\\*c\\+d\\?')
    expect(escapeRegex('(x)[y]{z}')).toBe('\\(x\\)\\[y\\]\\{z\\}')
    expect(escapeRegex('|^$\\')).toBe('\\|\\^\\$\\\\')
  })

  it('leaves plain text unchanged', () => {
    expect(escapeRegex('mainnet:abc123')).toBe('mainnet:abc123')
  })
})
