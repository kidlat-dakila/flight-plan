import { useEffect, useRef } from "react"
import { canNotify } from "@/notification-permission"

interface CompletionNotice {
  readonly title: string
  readonly body: string
}

const raiseNotification = (reviewId: string, { title, body }: CompletionNotice): void => {
  if (!canNotify() || Notification.permission !== "granted") return
  const notification = new Notification(title, { body, tag: reviewId })
  notification.addEventListener("click", () => {
    window.focus()
    notification.close()
  })
}

export const useCompletionNotification = (
  reviewId: string,
  isBeingWritten: boolean,
  completion: CompletionNotice | null,
  announce: (message: string) => void,
): void => {
  const awaitedReviewId = useRef<string | null>(null)

  useEffect(() => {
    if (isBeingWritten) {
      awaitedReviewId.current = reviewId
      return
    }
    if (completion === null || awaitedReviewId.current !== reviewId) return
    awaitedReviewId.current = null
    announce(completion.title)
    raiseNotification(reviewId, completion)
  }, [reviewId, isBeingWritten, completion, announce])
}
