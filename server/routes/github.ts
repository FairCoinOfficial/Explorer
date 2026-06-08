import { Router, type Request, type Response } from 'express'

const router = Router()

/**
 * GET /api/github
 *
 * Returns FairCoin's latest GitHub release plus the repository star count,
 * fetched server-side (so the GitHub token is never exposed to the browser)
 * and cached for {@link CACHE_TTL_MS}.
 *
 * Robustness:
 * - Optional `GITHUB_TOKEN` raises the unauthenticated rate limit when set.
 * - On 403 rate-limit (or any upstream failure) we serve the last successful
 *   payload if we have one, otherwise an `{ available: false }` placeholder.
 *   We never throw to the client.
 */

const GITHUB_OWNER = 'FairCoinOfficial'
const GITHUB_REPO = 'FairCoin'
const GITHUB_API_BASE = 'https://api.github.com'

/** 15 minutes, matching the frontend's expected freshness window. */
const CACHE_TTL_MS = 15 * 60 * 1000

type AssetOs = 'linux' | 'windows' | 'macos' | 'other'

interface ReleaseAsset {
  name: string
  downloadUrl: string
  size: number
  os: AssetOs
}

interface LatestRelease {
  tag: string
  name: string
  url: string
  publishedAt: string
  assets: ReleaseAsset[]
}

interface GitHubPayload {
  latestRelease: LatestRelease | null
  stars: number
}

interface UnavailablePayload {
  available: false
  latestRelease: null
  stars: number
}

// ---- GitHub API response shapes (only the fields we consume) ----

interface GitHubReleaseAssetResponse {
  name: string
  browser_download_url: string
  size: number
}

interface GitHubReleaseResponse {
  tag_name: string
  name: string | null
  html_url: string
  published_at: string
  assets: GitHubReleaseAssetResponse[]
}

interface GitHubRepoResponse {
  stargazers_count: number
}

/**
 * Derive the target OS from an asset filename.
 *
 * macOS and Windows markers are checked before the generic Linux archive
 * suffixes because Apple/Windows builds are sometimes shipped as `.tar.gz`/`.zip`
 * (e.g. `faircoin-v3.0.5-macos-arm64.tar.gz`); matching `.tar.gz` first would
 * misclassify them as Linux.
 */
function osFromAssetName(name: string): AssetOs {
  const lower = name.toLowerCase()
  if (lower.endsWith('.dmg') || lower.endsWith('.pkg') || lower.includes('macos')) return 'macos'
  if (lower.endsWith('.zip') || lower.endsWith('.exe') || lower.includes('windows')) return 'windows'
  if (lower.endsWith('.deb') || lower.endsWith('.tar.gz') || lower.includes('linux')) return 'linux'
  return 'other'
}

function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'User-Agent': 'faircoin-explorer',
    Accept: 'application/vnd.github+json',
  }
  const token = process.env.GITHUB_TOKEN
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  return headers
}

/** Thrown when GitHub responds 403 with no remaining rate-limit budget. */
class RateLimitError extends Error {
  constructor() {
    super('GitHub rate limit exceeded')
    this.name = 'RateLimitError'
  }
}

async function fetchGitHub<T>(path: string): Promise<T> {
  const res = await fetch(`${GITHUB_API_BASE}${path}`, { headers: buildHeaders() })

  if (!res.ok) {
    if (res.status === 403 || res.status === 429) {
      const remaining = res.headers.get('X-RateLimit-Remaining')
      if (remaining === '0' || res.status === 429) {
        throw new RateLimitError()
      }
    }
    throw new Error(`GitHub API error: ${res.status} ${res.statusText}`)
  }

  return (await res.json()) as T
}

function mapRelease(release: GitHubReleaseResponse): LatestRelease {
  return {
    tag: release.tag_name,
    name: release.name ?? release.tag_name,
    url: release.html_url,
    publishedAt: release.published_at,
    assets: (release.assets ?? []).map((asset) => ({
      name: asset.name,
      downloadUrl: asset.browser_download_url,
      size: asset.size,
      os: osFromAssetName(asset.name),
    })),
  }
}

// ---- Module-level cache + last-good fallback ----

interface CacheEntry {
  data: GitHubPayload
  expires: number
}

let cache: CacheEntry | null = null
let lastGood: GitHubPayload | null = null
/** De-duplicates concurrent cache misses into a single upstream fetch. */
let inFlight: Promise<GitHubPayload> | null = null

async function loadFromGitHub(): Promise<GitHubPayload> {
  const [release, repo] = await Promise.all([
    fetchGitHub<GitHubReleaseResponse>(`/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`),
    fetchGitHub<GitHubRepoResponse>(`/repos/${GITHUB_OWNER}/${GITHUB_REPO}`),
  ])

  return {
    latestRelease: mapRelease(release),
    stars: repo.stargazers_count ?? 0,
  }
}

async function getGitHubData(): Promise<GitHubPayload | UnavailablePayload> {
  const now = Date.now()
  if (cache && cache.expires > now) {
    return cache.data
  }

  // Single-flight: concurrent misses share one upstream round-trip.
  if (!inFlight) {
    inFlight = loadFromGitHub()
  }

  try {
    const data = await inFlight
    cache = { data, expires: now + CACHE_TTL_MS }
    lastGood = data
    return data
  } catch (error) {
    if (error instanceof RateLimitError) {
      console.error('GitHub rate limit hit while refreshing /api/github')
    } else {
      console.error('Error fetching GitHub data:', error)
    }
    // Serve the last successful payload when we have one, otherwise signal unavailability.
    if (lastGood) {
      return lastGood
    }
    return { available: false, latestRelease: null, stars: 0 }
  } finally {
    inFlight = null
  }
}

router.get('/', async (_req: Request, res: Response) => {
  const data = await getGitHubData()
  res.json(data)
})

export default router
