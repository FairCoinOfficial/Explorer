import { useSearchParams } from 'react-router-dom'

/** Keep pagination in the route so closing a mobile detail restores the page. */
export function usePageParam(key = 'page') {
  const [params, setParams] = useSearchParams()
  const value = Number(params.get(key))
  const page = Number.isSafeInteger(value) && value > 0 ? value : 1
  const setPage = (next: number) => {
    setParams(
      (previous) => {
        const updated = new URLSearchParams(previous)
        if (Number.isSafeInteger(next) && next > 1)
          updated.set(key, String(next))
        else updated.delete(key)
        return updated
      },
      { replace: true },
    )
  }
  return [page, setPage] as const
}
