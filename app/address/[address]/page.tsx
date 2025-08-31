import { AddressContent } from '@/components/address-content'

export default async function AddressPage({ params }: { params: Promise<{ address: string }> }) {
    const { address } = await params
    return <AddressContent address={address} />
}
