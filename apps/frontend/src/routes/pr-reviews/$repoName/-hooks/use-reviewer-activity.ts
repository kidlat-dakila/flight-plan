import { useMutation } from "@tanstack/react-query"
import { useEffect } from "react"
import { useTRPC } from "@/trpc"

interface ReviewKey {
  readonly repositoryName: string
  readonly targetId: string
}

const ACTIVITY_INTERVAL_MS = 30_000

const isPageVisible = (): boolean => document.visibilityState === "visible"

export const useReviewerActivity = ({ repositoryName, targetId }: ReviewKey): void => {
  const trpc = useTRPC()
  const { mutate } = useMutation(trpc.review.recordActivity.mutationOptions())

  useEffect(() => {
    const report = (): void => {
      if (isPageVisible()) mutate({ repositoryName, targetId })
    }
    report()
    const interval = window.setInterval(report, ACTIVITY_INTERVAL_MS)
    document.addEventListener("visibilitychange", report)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener("visibilitychange", report)
    }
  }, [repositoryName, targetId, mutate])
}
