import { useQuery } from "@tanstack/react-query"
import { useCallback, useEffect, useState } from "react"
import { useTRPC } from "@/trpc"
import type { UpdateToastNotice } from "@flightplan/ui/UpdateToast"

const UPDATE_TOAST_DURATION_MS = 20_000

export interface UpdateNoticeToast {
  readonly notice: UpdateToastNotice | null
  readonly isCopied: boolean
  readonly copy: () => void
  readonly close: () => void
}

export const useUpdateNotice = (): UpdateNoticeToast => {
  const trpc = useTRPC()
  const notice = useQuery({ ...trpc.updateNotice.queryOptions({}), staleTime: "static" }).data ?? null
  const [isClosed, setIsClosed] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const isShown = notice !== null && !isClosed

  useEffect(() => {
    if (!isShown) return undefined
    const timer = window.setTimeout(() => {
      setIsClosed(true)
    }, UPDATE_TOAST_DURATION_MS)
    return () => {
      window.clearTimeout(timer)
    }
  }, [isShown])

  const copy = useCallback(() => {
    if (notice === null) return
    navigator.clipboard.writeText(notice.command).then(
      () => {
        setIsCopied(true)
      },
      () => {
        setIsCopied(false)
      },
    )
  }, [notice])

  const close = useCallback(() => {
    setIsClosed(true)
  }, [])

  return { notice: isShown ? notice : null, isCopied, copy, close }
}
