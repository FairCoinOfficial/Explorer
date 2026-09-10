import { Suspense } from 'react'
import { MasternodesContent } from '@/components/masternodes-content'
import { PageLoading } from '@/components/page-loading'

export default function MasternodesPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <MasternodesContent />
    </Suspense>
  )
}
