import { DetailHeader } from '@/components/detail/detail-header'
import { ExplorerLink as Link } from '@/lib/explorer-navigation'
import { useTranslations } from '@/lib/i18n'
import { Button } from '@oxy.so/bloom/button'
import { EmptyState } from '@oxy.so/bloom/empty-state'
import { FileQuestion } from 'lucide-react'
import { View } from 'react-native'

export default function NotFoundPage() {
  const t = useTranslations('notFound')

  return (
    <View style={{ gap: 16 }}>
      <DetailHeader title={t('title')} />
      <EmptyState
        title={t('title')}
        description={t('description')}
        illustration={<FileQuestion size={32} />}
        footer={
          <Button asChild>
            <Link to="/">{t('backToHome')}</Link>
          </Button>
        }
      />
    </View>
  )
}
