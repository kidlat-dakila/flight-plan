import { useCallback, useEffect, useState } from "react"

const TOAST_DURATION_MS = 2500

export const useToast = (): readonly [string | null, (message: string) => void] => {
  const [toast, setToast] = useState<{ readonly message: string } | null>(null)

  useEffect(() => {
    if (toast === null) return undefined
    const timer = window.setTimeout(() => {
      setToast(null)
    }, TOAST_DURATION_MS)
    return () => {
      window.clearTimeout(timer)
    }
  }, [toast])

  const showToast = useCallback((message: string) => {
    setToast({
      message,
    })
  }, [])
  return [toast?.message ?? null, showToast]
}
