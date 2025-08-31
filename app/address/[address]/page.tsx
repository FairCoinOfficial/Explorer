import { AddressContent } from '@/components/address-content'

export default function AddressPage({ params }: { params: { address: string } }) {
    return <AddressContent address={params.address} />
}
