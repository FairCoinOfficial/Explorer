import { AdvancedSearchContent } from "@/components/advanced-search-content"
import { Suspense } from "react"

interface SearchPageProps {
    searchParams: { q?: string; network?: string }
}

export default function AdvancedSearchPage({ searchParams }: SearchPageProps) {
    const query = searchParams.q || ""
    const network = searchParams.network || "mainnet"

    return (
        <div className="flex-1 space-y-3 sm:space-y-4 p-2 pt-3 sm:p-4 md:p-6 lg:p-8">
            <Suspense fallback={<div>Loading search...</div>}>
                <AdvancedSearchContent initialQuery={query} initialNetwork={network} />
            </Suspense>
        </div>
    )
}
