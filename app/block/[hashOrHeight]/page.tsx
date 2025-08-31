import { BlockContent } from '@/components/block-content'

export default async function BlockPage({ params }: { params: Promise<{ hashOrHeight: string }> }) {
  const { hashOrHeight } = await params
  return <BlockContent hashOrHeight={hashOrHeight} />
}
