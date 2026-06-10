// Minimal log-level filter so debug-level chatter (per-connection lifecycle,
// per-broadcast counts, per-poll state diffs) is silent in production by
// default but can be re-enabled via LOG_LEVEL=debug.
//
// Levels follow the standard ordering: error > warn > info > debug. Setting
// LOG_LEVEL=info (the default) drops anything tagged 'debug'.

type Level = 'error' | 'warn' | 'info' | 'debug'

const LEVELS: Record<Level, number> = { error: 0, warn: 1, info: 2, debug: 3 }

function resolveLevel(): Level {
  const raw = (process.env.LOG_LEVEL ?? 'info').toLowerCase()
  return raw in LEVELS ? (raw as Level) : 'info'
}

const active = LEVELS[resolveLevel()]

function emit(level: Level, args: unknown[]): void {
  if (LEVELS[level] > active) return
  // Route through the matching console method so structured log collectors
  // (DO/Render/Vercel) keep their colouring and severity routing.
  const fn =
    level === 'error' ? console.error :
    level === 'warn' ? console.warn :
    console.log
  fn(...args)
}

export const logger = {
  error: (...args: unknown[]) => emit('error', args),
  warn: (...args: unknown[]) => emit('warn', args),
  info: (...args: unknown[]) => emit('info', args),
  debug: (...args: unknown[]) => emit('debug', args),
}
