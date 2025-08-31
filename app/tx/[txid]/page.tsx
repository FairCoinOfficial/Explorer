import { TransactionContent } from '@/components/transaction-content'

export default function TxPage({ params }: { params: { txid: string } }) {
  return <TransactionContent txid={params.txid} />
}
