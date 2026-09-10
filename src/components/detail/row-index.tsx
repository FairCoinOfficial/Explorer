/**
 * Fixed-width, right-aligned muted index cell (e.g. "#0") for numbered list
 * rows — transaction inputs/outputs, block transactions. Keeps the index column
 * identical across detail lists.
 */
export function RowIndex({ n }: { n: number }) {
  return (
    <span className="w-8 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
      #{n}
    </span>
  )
}
