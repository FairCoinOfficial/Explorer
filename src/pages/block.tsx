import { useParams } from 'react-router-dom'
import { BlockContent } from '@/components/block-content'
export default function BlockPage() {
  const { hashOrHeight } = useParams<{ hashOrHeight: string }>()
  return <BlockContent hashOrHeight={hashOrHeight || ''} />
}
