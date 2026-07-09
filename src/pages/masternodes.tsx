import { Suspense } from 'react'
import { MasternodesContent } from '@/components/masternodes-content'
export default function MasternodesPage() {
  return (
    <div className="flex-1 space-y-3 sm:space-y-4">
      <Suspense fallback={<div>Loading masternodes...</div>}>
        <MasternodesContent />
      </Suspense>
    </div>
  )
}
