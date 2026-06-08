import { useQuery } from '@tanstack/react-query'

export interface GithubReleaseAsset {
  name: string
  downloadUrl: string
  size: number
  os: string
}

export interface GithubLatestRelease {
  tag: string
  name: string
  url: string
  publishedAt: string
  assets: GithubReleaseAsset[]
}

export interface GithubStats {
  latestRelease: GithubLatestRelease | null
  stars: number
}

export type GithubResult =
  | { status: 'ok'; data: GithubStats }
  | { status: 'unavailable' }

function isGithubStats(value: unknown): value is GithubStats {
  if (typeof value !== 'object' || value === null) return false
  return 'stars' in value && 'latestRelease' in value
}

/**
 * Fetches release/star data from the explorer's `/api/github` endpoint.
 * The endpoint may not exist yet in some environments; in that case the SPA
 * fallback returns HTML, so we treat any non-JSON / error response as
 * "unavailable" and let the UI render a graceful placeholder.
 */
export function useGithubStats() {
  return useQuery<GithubResult>({
    queryKey: ['github-stats'],
    queryFn: async (): Promise<GithubResult> => {
      try {
        const response = await fetch('/api/github', {
          headers: { Accept: 'application/json' },
        })
        if (!response.ok) {
          return { status: 'unavailable' }
        }
        const contentType = response.headers.get('content-type') ?? ''
        if (!contentType.includes('application/json')) {
          return { status: 'unavailable' }
        }
        const data: unknown = await response.json()
        if (!isGithubStats(data)) {
          return { status: 'unavailable' }
        }
        return { status: 'ok', data }
      } catch {
        return { status: 'unavailable' }
      }
    },
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
    retry: false,
  })
}
