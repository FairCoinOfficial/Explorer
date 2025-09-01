import { PageContent } from '@/components/page-content';

export default function Page() {
    // Test data to avoid external dependencies
    const mockHeight = 12345;
    const mockBlocks = [
        {
            height: 12345,
            hash: "00000000000000000000000000000000000000000000000000000000000000000",
            time: Math.floor(Date.now() / 1000),
            nTx: 10,
            size: 1024,
            tx: ["tx1", "tx2", "tx3"]
        }
    ];
    const mockTxFeed = ["tx1", "tx2", "tx3"];

    return <PageContent height={mockHeight} blocks={mockBlocks} txFeed={mockTxFeed} />;
}
