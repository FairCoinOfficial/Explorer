import { NetworkStatusContent } from "@/components/network-status-content"

export default function NetworkStatusPage() {
    return (
        <div className="flex-1 space-y-3 sm:space-y-4 p-2 pt-3 sm:p-4 md:p-6 lg:p-8">
            <NetworkStatusContent />
        </div>
    )
}
