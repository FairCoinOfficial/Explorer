import { TransactionContent } from '@/components/transaction-content'

export default async function TxPage({ params }: { params: Promise<{ txid: string }> }) {
  const { txid } = await params
  return <TransactionContent txid={txid} />
}
