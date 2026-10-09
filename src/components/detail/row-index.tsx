import { Muted } from '@oxy.so/bloom/typography'

export function RowIndex({ n }: { n: number }) {
  return (
    <Muted
      style={{
        minWidth: 32,
        textAlign: 'right',
        fontVariant: ['tabular-nums'],
      }}
    >
      #{n}
    </Muted>
  )
}
