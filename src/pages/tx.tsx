import { TransactionContent } from '@/components/transaction-content'
import { useParams } from 'react-router-dom'
export default function TxPage() {
  const { txid } = useParams<{ txid: string }>()
  return <TransactionContent txid={txid || ''} />
}
