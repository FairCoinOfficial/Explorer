import { DetailHeader } from '@/components/detail/detail-header'
import { useTranslations } from '@/lib/i18n'
import { Loading } from '@oxy.so/bloom/loading'
import { Box } from '@oxy.so/bloom/skeleton'
import { View } from 'react-native'

export function PageLoading() {
  const t = useTranslations('common')
  return (
    <View style={{ gap: 16 }}>
      <DetailHeader title={t('loading')} />
      <Loading text={t('loading')} accessibilityLabel={t('loading')} />
      <Box width="100%" height={320} />
    </View>
  )
}
