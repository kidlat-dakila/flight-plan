import { useCallback, useEffect, useState } from "react"
import { useFailureTroubleshooting, type Failure } from "@/troubleshooting"

const TOAST_DURATION_MS = 2500
const FAILURE_TOAST_DURATION_MS = 8000

export type ToastContent = string | Failure

export interface ShownToast {
  readonly message: string
  readonly onTroubleshoot: (() => void) | null
}

interface ToastState {
  readonly message: string
  readonly failure: Failure | null
}

const toastStateOf = (content: ToastContent): ToastState =>
  typeof content === "string" ? { message: content, failure: null } : { message: content.message, failure: content }

export const useToast = (): readonly [ShownToast | null, (content: ToastContent) => void] => {
  const troubleshootFailure = useFailureTroubleshooting()
  const [toast, setToast] = useState<ToastState | null>(null)

  useEffect(() => {
    if (toast === null) return undefined
    const timer = window.setTimeout(() => {
      setToast(null)
    }, toast.failure === null ? TOAST_DURATION_MS : FAILURE_TOAST_DURATION_MS)
    return () => {
      window.clearTimeout(timer)
    }
  }, [toast])

  const showToast = useCallback((content: ToastContent) => {
    setToast(toastStateOf(content))
  }, [])
  return [toast === null ? null : { message: toast.message, onTroubleshoot: troubleshootFailure(toast.failure) }, showToast]
}
