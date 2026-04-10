import { useParams } from 'react-router-dom'
import { TransactionContent } from '@/components/transaction-content'
export default function TxPage() {
  const { txid } = useParams<{ txid: string }>()
  return <TransactionContent txid={txid || ''} />
}
