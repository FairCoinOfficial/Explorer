import { Suspense } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AdvancedSearchContent } from '@/components/advanced-search-content'

export default function SearchPage() {
  const [searchParams] = useSearchParams()
  const query = searchParams.get('q') || ''
  const network = searchParams.get('network') || 'mainnet'

  return (
    <div className="flex-1 space-y-3 sm:space-y-4 p-2 pt-3 sm:p-4 md:p-6 lg:p-8">
      <Suspense fallback={<div>Loading search...</div>}>
        <AdvancedSearchContent initialQuery={query} initialNetwork={network} />
      </Suspense>
    </div>
  )
}
