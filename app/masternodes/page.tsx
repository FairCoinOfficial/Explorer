import { Suspense } from "react"
import { MasternodesContent } from "@/components/masternodes-content"

export default function MasternodesPage() {
    return (
        <div className="flex-1 space-y-3 sm:space-y-4 p-2 pt-3 sm:p-4 md:p-6 lg:p-8">
            <Suspense fallback={<div>Loading masternodes...</div>}>
                <MasternodesContent />
            </Suspense>
        </div>
    )
}
