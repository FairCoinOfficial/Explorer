import { formatNumber } from '@/lib/format'
import { StatBar } from '@oxy.so/bloom/stat-bar'

export function ConfirmationMeter({
  confirmations,
  label,
}: {
  confirmations: number
  label: string
}) {
  return (
    <StatBar
      label={label}
      value={confirmations}
      max={100}
      minLabel={formatNumber(confirmations)}
      maxLabel="100"
    />
  )
}
