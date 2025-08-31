import { BlockContent } from '@/components/block-content'

export default function BlockPage({ params }: { params: { hashOrHeight: string } }) {
    return <BlockContent hashOrHeight={params.hashOrHeight} />
}
