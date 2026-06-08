import { Github, Star, Download, Tag } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useTranslations } from '@/lib/i18n'
import { useGithubStats, type GithubReleaseAsset } from '@/hooks/use-github-stats'
import { ModuleCard } from '@/components/home/module-card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatBytes, formatCompactNumber } from '@/lib/format'

const REPO_URL = 'https://github.com/FairCoinOfficial/FairCoin'

function assetLabel(asset: GithubReleaseAsset): string {
  return asset.os && asset.os.toLowerCase() !== 'unknown' ? asset.os : asset.name
}

export function GithubCard() {
  const t = useTranslations('home')
  const { data, isLoading } = useGithubStats()

  const stars = data?.status === 'ok' ? data.data.stars : null
  const release = data?.status === 'ok' ? data.data.latestRelease : null

  const action =
    stars !== null ? (
      <span className="inline-flex items-center gap-1 rounded-full bg-muted/70 px-2 py-0.5 text-xs font-medium tabular-nums">
        <Star className="size-3" />
        {formatCompactNumber(stars)}
      </span>
    ) : undefined

  return (
    <ModuleCard
      title={t('githubTitle')}
      icon={Github}
      action={action}
      href={REPO_URL}
      external
      footerLabel={t('githubViewRepo')}
    >
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      ) : release ? (
        <div className="flex flex-1 flex-col">
          <div className="flex items-center gap-2">
            <Tag className="size-4 text-muted-foreground" />
            <span className="text-base font-semibold tracking-tight">{release.tag}</span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t('githubReleased', {
              when: formatDistanceToNow(new Date(release.publishedAt), { addSuffix: true }),
            })}
          </p>

          {release.assets.length > 0 ? (
            <div className="mt-3 flex flex-col gap-1.5">
              {release.assets.slice(0, 3).map((asset) => (
                <Button
                  key={asset.downloadUrl}
                  asChild
                  variant="secondary"
                  size="sm"
                  className="justify-between rounded-lg"
                >
                  <a href={asset.downloadUrl} target="_blank" rel="noopener noreferrer">
                    <span className="inline-flex items-center gap-1.5 truncate">
                      <Download className="size-3.5" />
                      <span className="truncate">{assetLabel(asset)}</span>
                    </span>
                    <span className="ml-2 shrink-0 text-xs text-muted-foreground tabular-nums">
                      {formatBytes(asset.size)}
                    </span>
                  </a>
                </Button>
              ))}
            </div>
          ) : (
            <Button asChild variant="secondary" size="sm" className="mt-3 rounded-lg">
              <a href={release.url} target="_blank" rel="noopener noreferrer">
                <Download className="size-3.5" />
                {t('githubViewRelease')}
              </a>
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-1 flex-col justify-center">
          <p className="text-sm font-medium">{t('githubUnavailable')}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t('githubUnavailableHint')}</p>
        </div>
      )}
    </ModuleCard>
  )
}
