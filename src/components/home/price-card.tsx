import { useCoinPrice, usePriceHistory } from '@/hooks/use-coin-price'
import { preparePrices } from '@/lib/chart-data'
import { formatUsd } from '@/lib/format'
import { useLocale, useTranslations } from '@/lib/i18n'
import { WFAIR_CONFIG } from '@/lib/wfair'
import { Button } from '@oxy.so/bloom/button'
import {
  Card,
  CardBody,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@oxy.so/bloom/card'
import { ChartHeader, LineChartCard } from '@oxy.so/bloom/chart-cards'
import { EmptyState } from '@oxy.so/bloom/empty-state'
import { Box } from '@oxy.so/bloom/skeleton'

export function PriceCard() {
  const t = useTranslations('home')
  const charts = useTranslations('charts')
  const locale = useLocale()
  const price = useCoinPrice()
  const history = usePriceHistory('7d')
  const rows = preparePrices(history.data ?? [])
  if (price.isLoading) return <Box width={'100%'} height={320} />
  if (rows.length >= 2)
    return (
      <LineChartCard
        title={t('priceTitle')}
        data={rows.map((row) => ({
          label: new Date(row.time).toLocaleDateString(locale, {
            month: 'short',
            day: 'numeric',
          }),
          value: row.price_usd,
        }))}
        headline={price.data?.price ?? rows.at(-1)?.price_usd}
        format={formatUsd}
        formatAxisValue={(value) =>
          value.toLocaleString(locale, { maximumFractionDigits: 2 })
        }
        getPointTitle={(point) => point.label}
        accessibilityLabel={t('priceTitle')}
      />
    )
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('priceTitle')}</CardTitle>
        <CardDescription>{t('priceSource')}</CardDescription>
      </CardHeader>
      <CardBody>
        {price.data?.price != null && (
          <ChartHeader
            label={t('priceUnit')}
            value={price.data.price}
            format={formatUsd}
          />
        )}
        <EmptyState
          variant="compact"
          title={
            price.data?.price == null
              ? t('priceNoMarket')
              : charts('noPriceHistory')
          }
          description={t('priceAwaitingLiquidity')}
          footer={
            <Button
              appearance="plain"
              size="sm"
              href={WFAIR_CONFIG.buyUrl}
              target="_blank"
            >
              {t('priceGetFair')}
            </Button>
          }
        />
      </CardBody>
    </Card>
  )
}
