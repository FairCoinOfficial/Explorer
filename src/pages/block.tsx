import { BlockContent } from '@/components/block-content'
import { useParams } from 'react-router-dom'
export default function BlockPage() {
  const { hashOrHeight } = useParams<{ hashOrHeight: string }>()
  return <BlockContent hashOrHeight={hashOrHeight || ''} />
}
