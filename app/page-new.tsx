import { blockCache } from '@/lib/cache';
import { PageContent } from '@/components/page-content';

async function getLatestBlocks(limit = 10) {
    const height = await blockCache.getBlockCount('mainnet');
    const blocks = await blockCache.getRecentBlocks('mainnet', limit);
    return { height, blocks };
}

export default async function Page() {
    const { height, blocks } = await getLatestBlocks(10);

    // transactions feed: take tx ids from the latest block (if available)
    const latest = blocks[0] ?? null;
    const txFeed = latest?.tx?.slice(0, 12) ?? [];

    return <PageContent height={height} blocks={blocks} txFeed={txFeed} />;
}
