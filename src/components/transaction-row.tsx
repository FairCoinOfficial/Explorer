import { RelativeTime } from '@/components/detail/relative-time'
import { useDetailSelection } from '@/contexts/detail-pane-context'
import type { RecentTransaction } from '@/hooks/use-recent-transactions'
import { ExplorerLink } from '@/lib/explorer-navigation'
import { formatFair, formatNumber, shortHash } from '@/lib/format'
import { useTranslations } from '@/lib/i18n'
import { Chip } from '@oxy.so/bloom/chip'
import { Item } from '@oxy.so/bloom/item'
import { Muted, Text } from '@oxy.so/bloom/typography'
import { View } from 'react-native'

export function TransactionRow({ tx }: { tx: RecentTransaction }) {
  const t = useTranslations('transactions')
  const selected = useDetailSelection()
  const pending = tx.blockHeight === null || tx.unconfirmed
  return (
    <li>
      <ExplorerLink to={`/tx/${tx.txid}`}>
        <Item
          density="compact"
          active={selected === `/tx/${tx.txid}`}
          title={shortHash(tx.txid)}
          subtitle={
            pending ? (
              <Chip size="sm" tone="warning">
                {t('unconfirmed')}
              </Chip>
            ) : (
              <RelativeTime timestamp={tx.time} />
            )
          }
          trailing={
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              {typeof tx.amount === 'number' && (
                <Text>{formatFair(tx.amount)}</Text>
              )}
              <Muted>
                {tx.blockHeight === null
                  ? t('mempool')
                  : `#${formatNumber(tx.blockHeight)}`}
              </Muted>
            </View>
          }
        />
      </ExplorerLink>
    </li>
  )
}
