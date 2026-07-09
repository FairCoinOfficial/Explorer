/**
 * Curated FairCoin address labels shown on address pages.
 *
 * Keep this map small and verified — do not invent addresses. Bridge custody
 * uses HD deposit addresses (not a single static hot wallet), so only add
 * addresses that are publicly documented and stable.
 */
export interface KnownAddressLabel {
  /** Short badge text (e.g. "Bridge"). */
  label: string
  /** Optional longer description for tooltips / subtitle. */
  description?: string
}

/**
 * Mainnet address → label. Keys must be exact FairCoin base58 addresses.
 * Empty until publicly documented static addresses are confirmed.
 */
const MAINNET_LABELS: Record<string, KnownAddressLabel> = {
  // Intentionally empty: WFAIR bridge uses per-user HD deposit addresses.
  // Add treasury / foundation / documented cold wallets here when published.
}

const TESTNET_LABELS: Record<string, KnownAddressLabel> = {}

export function getKnownAddressLabel(
  address: string,
  network: 'mainnet' | 'testnet' = 'mainnet',
): KnownAddressLabel | null {
  const map = network === 'testnet' ? TESTNET_LABELS : MAINNET_LABELS
  return map[address] ?? null
}
