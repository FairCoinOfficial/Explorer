import { RelativeTime } from '@/components/detail/relative-time'
import { useDetailSelection } from '@/contexts/detail-pane-context'
import type { RecentBlock } from '@/hooks/use-recent-blocks'
import { ExplorerLink } from '@/lib/explorer-navigation'
import { formatNumber, shortHash } from '@/lib/format'
import { useTranslations } from '@/lib/i18n'
import { Item } from '@oxy.so/bloom/item'
import { Muted, Text } from '@oxy.so/bloom/typography'
import { View } from 'react-native'

export function BlockRow({ block }: { block: RecentBlock }) {
  const t = useTranslations('blocks')
  const selected = useDetailSelection()
  return (
    <li>
      <ExplorerLink to={`/block/${block.height}`}>
        <Item
          density="compact"
          active={
            selected === `/block/${block.height}` ||
            selected === `/block/${block.hash}`
          }
          title={`#${formatNumber(block.height)}`}
          subtitle={shortHash(block.hash)}
          trailing={
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <Text>
                {t('txCount', { count: block.nTx ?? block.tx.length })}
              </Text>
              <Muted>
                <RelativeTime timestamp={block.time} />
              </Muted>
            </View>
          }
        />
      </ExplorerLink>
    </li>
  )
}
