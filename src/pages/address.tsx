import { useParams } from 'react-router-dom'
import { AddressContent } from '@/components/address-content'
export default function AddressPage() {
  const { address } = useParams<{ address: string }>()
  return <AddressContent address={address || ''} />
}
