import { useCallback, useId, useMemo, type PointerEvent } from 'react'
import { cn } from '@/lib/utils'

/**
 * A single sparkline datum. Plain `number[]` is also accepted (and normalized to
 * this shape internally), so callers can pass either `[1, 2, 3]` or
 * `[{ value: 1 }, …]` — whichever is more convenient at the call site.
 */
export interface SparklinePoint {
  value: number
}

interface SparklineProps {
  /** The series to plot, oldest→newest. Accepts raw numbers or `{ value }`. */
  data: readonly number[] | readonly SparklinePoint[]
  className?: string
  /**
   * Line/area color. Defaults to the bright lime accent token. Pass any CSS
   * color string; keep it a token (e.g. `hsl(var(--accent))`) to stay themable.
   */
  stroke?: string
  /** Draw the gradient-filled area below the line. Defaults to `true`. */
  fill?: boolean
  /**
   * Enable pointer interaction: a transparent overlay tracks the cursor, a dot
   * snaps to the nearest point on the line, and {@link onHoverIndex} fires with
   * that index (or `null` on leave). When `false` the SVG is purely decorative
   * and marked `aria-hidden`.
   */
  interactive?: boolean
  /** Notified with the hovered data index, or `null` when the pointer leaves. */
  onHoverIndex?: (index: number | null) => void
  /** Controlled hovered index from the parent; drives the dot position. */
  activeIndex?: number | null
  /** Line thickness in viewBox units. */
  strokeWidth?: number
}

// The polyline is computed in this fixed coordinate space and scaled to the
// host element by `preserveAspectRatio="none"`. The values are arbitrary; only
// their ratio (and the small vertical padding) affects the rendered shape.
const VIEW_WIDTH = 100
const VIEW_HEIGHT = 32
/** Vertical breathing room so the stroke never clips at the extremes. */
const VERTICAL_PADDING = 3

interface Normalized {
  /** Per-point coordinates in viewBox space, index-aligned with the input data. */
  points: { x: number; y: number }[]
  /** `<path>` "d" for the line through every point. */
  linePath: string
  /** `<path>` "d" for the closed area under the line (down to the baseline). */
  areaPath: string
}

function toValues(data: readonly number[] | readonly SparklinePoint[]): number[] {
  return data.map((point) => (typeof point === 'number' ? point : point.value))
}

/**
 * Project the series into viewBox coordinates and build the line + area paths.
 *
 * Degenerate inputs render as a flat baseline rather than throwing or producing
 * `NaN` geometry: an empty/single-point series, or a series whose values are all
 * equal (zero range), is drawn as a level line through the vertical midpoint.
 */
function normalize(values: number[]): Normalized {
  const midY = VIEW_HEIGHT / 2

  if (values.length < 2) {
    const linePath = `M 0 ${midY} L ${VIEW_WIDTH} ${midY}`
    return {
      points:
        values.length === 1 ? [{ x: VIEW_WIDTH / 2, y: midY }] : [],
      linePath,
      areaPath: `${linePath} L ${VIEW_WIDTH} ${VIEW_HEIGHT} L 0 ${VIEW_HEIGHT} Z`,
    }
  }

  let min = values[0]
  let max = values[0]
  for (const value of values) {
    if (value < min) min = value
    if (value > max) max = value
  }
  const range = max - min

  const usableHeight = VIEW_HEIGHT - VERTICAL_PADDING * 2
  const stepX = VIEW_WIDTH / (values.length - 1)

  const points = values.map((value, index) => {
    const x = index * stepX
    // Flat series → pin to the midline; otherwise scale into the padded band.
    // SVG y grows downward, so the max value maps to the smallest y (top).
    const y =
      range === 0
        ? midY
        : VERTICAL_PADDING + (1 - (value - min) / range) * usableHeight
    return { x, y }
  })

  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ')

  const first = points[0]
  const last = points[points.length - 1]
  const areaPath = `${linePath} L ${last.x.toFixed(2)} ${VIEW_HEIGHT} L ${first.x.toFixed(2)} ${VIEW_HEIGHT} Z`

  return { points, linePath, areaPath }
}

/**
 * Lightweight, dependency-free SVG sparkline.
 *
 * Renders a single `<svg>` containing the trend line and (optionally) a
 * gradient-filled area beneath it. Can be a passive background flourish or an
 * interactive chart that reports the hovered index and pins a dot to the line.
 *
 * Intentionally has no charting-library dependency so it stays cheap enough to
 * scatter behind several home tiles without weighing down the bundle.
 */
export function Sparkline({
  data,
  className,
  stroke = 'hsl(var(--accent))',
  fill = true,
  interactive = false,
  onHoverIndex,
  activeIndex = null,
  strokeWidth = 1.5,
}: SparklineProps) {
  const gradientId = useId()
  const values = useMemo(() => toValues(data), [data])
  const { points, linePath, areaPath } = useMemo(() => normalize(values), [values])

  // Map a pointer position (0..1 across the element) to the nearest data index.
  const handlePointerMove = useCallback(
    (event: PointerEvent<SVGRectElement>) => {
      if (!onHoverIndex || points.length === 0) return
      const rect = event.currentTarget.getBoundingClientRect()
      if (rect.width === 0) return
      const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1)
      const index = Math.round(ratio * (points.length - 1))
      onHoverIndex(index)
    },
    [onHoverIndex, points.length],
  )

  const handlePointerLeave = useCallback(() => {
    onHoverIndex?.(null)
  }, [onHoverIndex])

  const activePoint =
    interactive && activeIndex !== null && activeIndex >= 0 && activeIndex < points.length
      ? points[activeIndex]
      : null

  return (
    <svg
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      preserveAspectRatio="none"
      className={cn('h-full w-full overflow-visible', className)}
      aria-hidden={!interactive}
    >
      {fill ? (
        <>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.3} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
        </>
      ) : null}

      <path
        d={linePath}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />

      {activePoint ? (
        <circle
          cx={activePoint.x}
          cy={activePoint.y}
          r={3}
          fill={stroke}
          stroke="hsl(var(--background))"
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />
      ) : null}

      {interactive ? (
        // Transparent hit area spanning the full plot; the only element that
        // receives pointer events (the paths above stay inert).
        <rect
          x={0}
          y={0}
          width={VIEW_WIDTH}
          height={VIEW_HEIGHT}
          fill="transparent"
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          style={{ cursor: 'crosshair', touchAction: 'none' }}
        />
      ) : null}
    </svg>
  )
}
