import { AddressContent } from '@/components/address-content'
import { useParams } from 'react-router-dom'
export default function AddressPage() {
  const { address } = useParams<{ address: string }>()
  return <AddressContent address={address || ''} />
}
