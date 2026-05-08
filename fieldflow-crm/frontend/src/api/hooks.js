import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * useApiData — load data from the API with a localStorage fallback.
 *
 * @param {() => Promise<any>} fetchFn   — API fetch function
 * @param {() => any}          fallbackFn — synchronous localStorage reader
 * @returns {{ data, setData, loading, error, refresh }}
 */
export function useApiData(fetchFn, fallbackFn) {
  const [data, setData] = useState(() => {
    try { return fallbackFn() ?? [] } catch { return [] }
  })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const cancelled = useRef(false)

  const refresh = useCallback(async () => {
    cancelled.current = false
    setLoading(true)
    setError(null)
    try {
      const result = await fetchFn()
      if (cancelled.current) return
      // API may return { data: [...] } or the array directly
      const list = Array.isArray(result) ? result : (result?.data ?? result)
      if (list !== null && list !== undefined) setData(list)
    } catch (err) {
      if (!cancelled.current) setError(err.message)
      // silently keep localStorage data on failure
    } finally {
      if (!cancelled.current) setLoading(false)
    }
  }, [fetchFn])

  useEffect(() => {
    refresh()
    return () => { cancelled.current = true }
  }, [refresh])

  return { data, setData, loading, error, refresh }
}

/**
 * withFallback — try an API call; on any error run the local fallback instead.
 */
export async function withFallback(apiFn, localFn) {
  try { return await apiFn() } catch { return localFn() }
}
