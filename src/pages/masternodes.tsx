import { MasternodesContent } from '@/components/masternodes-content'
import { PageLoading } from '@/components/page-loading'
import { Suspense } from 'react'

export default function MasternodesPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <MasternodesContent />
    </Suspense>
  )
}
