import {
  useGithubStats,
  type GithubReleaseAsset,
} from '@/hooks/use-github-stats'
import { formatBytes, formatCompactNumber } from '@/lib/format'
import { useLocale, useTranslations, type Locale } from '@/lib/i18n'
import { Button } from '@oxy.so/bloom/button'
import {
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@oxy.so/bloom/card'
import { Box } from '@oxy.so/bloom/skeleton'
import { formatDistanceToNow } from 'date-fns'
import {
  ar,
  bn,
  ca,
  de,
  enUS,
  es,
  fr,
  hi,
  id,
  ja,
  ko,
  pt,
  ru,
  tr,
  vi,
  zhCN,
} from 'date-fns/locale'
import { Download, Star, Tag } from 'lucide-react'

const DATE_FNS_LOCALES: Record<Locale, typeof enUS> = {
  en: enUS,
  es,
  fr,
  de,
  ru,
  zh: zhCN,
  ja,
  ko,
  ca,
  hi,
  ar,
  bn,
  pt,
  id,
  ur: ar,
  tr,
  vi,
}

const REPO_URL = 'https://github.com/FairCoinOfficial/FairCoin'

function assetLabel(asset: GithubReleaseAsset): string {
  return asset.os && asset.os.toLowerCase() !== 'unknown'
    ? asset.os
    : asset.name
}

export function GithubCard() {
  const t = useTranslations('home')
  const locale = useLocale()
  const { data, isLoading } = useGithubStats()

  const stars = data?.status === 'ok' ? data.data.stars : null
  const release = data?.status === 'ok' ? data.data.latestRelease : null

  const action =
    stars !== null ? (
      <span className="inline-flex items-center gap-1 text-xs font-medium tabular-nums text-muted-foreground">
        <Star className="size-3" />
        {formatCompactNumber(stars)}
      </span>
    ) : undefined

  return (
    <Card style={{ flexGrow: 1 }}>
      <CardHeader>
        <CardTitle>{t('githubTitle')}</CardTitle>
        {action}
      </CardHeader>
      <CardBody style={{ flexGrow: 1 }}>
        {isLoading ? (
          <div className="space-y-2">
            <Box width={128} height={24} />
            <Box width={'100%'} height={32} />
            <Box width={'100%'} height={32} />
          </div>
        ) : release ? (
          <div className="flex flex-1 flex-col">
            <div className="flex items-center gap-2">
              <Tag className="size-4 text-muted-foreground" />
              <span className="text-base font-semibold tracking-tight">
                {release.tag}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t('githubReleased', {
                when: formatDistanceToNow(new Date(release.publishedAt), {
                  addSuffix: true,
                  locale: DATE_FNS_LOCALES[locale],
                }),
              })}
            </p>

            {release.assets.length > 0 ? (
              <div className="mt-3 flex flex-col gap-1.5">
                {release.assets.slice(0, 3).map((asset) => (
                  <Button
                    key={asset.downloadUrl}
                    appearance="subtle"
                    size="sm"
                    href={asset.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className="inline-flex items-center gap-1.5 truncate">
                      <Download className="size-3.5" />
                      <span className="truncate">{assetLabel(asset)}</span>
                    </span>
                    <span className="ml-2 shrink-0 text-xs text-muted-foreground tabular-nums">
                      {formatBytes(asset.size)}
                    </span>
                  </Button>
                ))}
              </div>
            ) : (
              <Button
                appearance="subtle"
                size="sm"
                href={release.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download className="size-3.5" />
                {t('githubViewRelease')}
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-1 flex-col justify-center">
            <p className="text-sm font-medium">{t('githubUnavailable')}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t('githubUnavailableHint')}
            </p>
          </div>
        )}
      </CardBody>
      <CardFooter>
        <Button
          appearance="plain"
          size="sm"
          href={REPO_URL}
          target="_blank"
          rel="noreferrer"
        >
          {t('githubViewRepo')}
        </Button>
      </CardFooter>
    </Card>
  )
}
