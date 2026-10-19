import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useDeferredValue, useState } from "react"
import { useTRPC } from "@/trpc"
import type { LineAddress } from "@flightplan/ui/CodeBlock"
import type { CommentRange } from "@flightplan/ui/FileRows"
import type { ReviewerRequesting } from "@flightplan/ui/ReviewHeader"

interface ReviewKey {
  readonly repositoryName: string
  readonly targetId: string
}

type ReviewVerdict = "comment" | "approve" | "request-changes"

interface Composing {
  readonly path: string
  readonly anchorLineLabel: string
  readonly range: CommentRange
}

export interface ReviewDiscussion {
  readonly composingRangeOf: (path: string) => CommentRange | null
  readonly isCommentPending: boolean
  readonly isSubmitting: boolean
  readonly isDiscarding: boolean
  readonly submissionCount: number
  readonly submissionError: string | null
  readonly reviewerRequesting: ReviewerRequesting
  readonly onStartComment: (path: string, address: LineAddress | null, isExtending: boolean) => void
  readonly onStartRangeComment: (path: string, range: CommentRange) => void
  readonly onAddComment: (path: string, range: CommentRange, body: string) => void
  readonly onPostComment: (path: string, range: CommentRange, body: string) => void
  readonly onComment: (body: string) => void
  readonly onReply: (threadId: string, body: string) => void
  readonly onResolveThread: (threadId: string, isResolved: boolean) => void
  readonly onDiscardComment: (commentId: string) => void
  readonly onSubmit: (verdict: ReviewVerdict, body: string) => void
}

const DECIMAL = 10
const REVIEW_SUBMITTED_MESSAGE = "Review submitted"

const lineOf = (lineLabel: string): number => Number.parseInt(lineLabel, DECIMAL)

const positionOf = (path: string, range: CommentRange) => ({
  path,
  side: range.side,
  startLine: lineOf(range.startLineLabel),
  endLine: lineOf(range.lineLabel),
})

export const composeAt = (
  composing: Composing | null,
  path: string,
  address: LineAddress | null,
  isExtending: boolean,
): Composing | null => {
  if (address === null) return null
  const single: Composing = {
    path,
    anchorLineLabel: address.lineLabel,
    range: { side: address.side, startLineLabel: address.lineLabel, lineLabel: address.lineLabel },
  }
  if (!isExtending || composing?.path !== path || composing.range.side !== address.side) return single
  const anchor = lineOf(composing.anchorLineLabel)
  const reached = lineOf(address.lineLabel)
  return {
    ...composing,
    range: {
      side: address.side,
      startLineLabel: String(Math.min(anchor, reached)),
      lineLabel: String(Math.max(anchor, reached)),
    },
  }
}

export const useReviewDiscussion = (reviewKey: ReviewKey, showToast: (message: string) => void): ReviewDiscussion => {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const [composing, setComposing] = useState<Composing | null>(null)
  const [submissionCount, setSubmissionCount] = useState(0)
  const [reviewerQuery, setReviewerQuery] = useState("")
  const [isSearchingReviewers, setIsSearchingReviewers] = useState(false)
  const deferredReviewerQuery = useDeferredValue(reviewerQuery)

  const refreshReview = async (): Promise<void> => {
    await queryClient.invalidateQueries(trpc.review.get.pathFilter())
  }
  const refreshReviewers = async (): Promise<void> => {
    await Promise.all([refreshReview(), queryClient.invalidateQueries(trpc.review.searchReviewers.pathFilter())])
  }
  const reportError = (error: { readonly message: string }): void => {
    showToast(error.message)
  }
  const refreshing = { onSuccess: refreshReview, onError: reportError }

  const addComment = useMutation(
    trpc.review.addComment.mutationOptions({
      onSuccess: async () => {
        setComposing(null)
        await refreshReview()
      },
      onError: reportError,
    }),
  )
  const discardComment = useMutation(trpc.review.discardComment.mutationOptions(refreshing))
  const replyToThread = useMutation(trpc.review.replyToThread.mutationOptions(refreshing))
  const resolveThread = useMutation(trpc.review.resolveThread.mutationOptions(refreshing))
  const submitReview = useMutation(
    trpc.review.submit.mutationOptions({
      onSuccess: async () => {
        setSubmissionCount((count) => count + 1)
        showToast(REVIEW_SUBMITTED_MESSAGE)
        await Promise.all([refreshReview(), queryClient.invalidateQueries(trpc.repository.list.pathFilter())])
      },
    }),
  )
  const requestReviewer = useMutation(trpc.review.requestReviewer.mutationOptions({ onSuccess: refreshReviewers, onError: reportError }))
  const removeReviewRequest = useMutation(trpc.review.removeReviewRequest.mutationOptions({ onSuccess: refreshReviewers, onError: reportError }))
  const reviewers = useQuery({
    ...trpc.review.searchReviewers.queryOptions({ ...reviewKey, query: deferredReviewerQuery }),
    enabled: isSearchingReviewers,
    placeholderData: keepPreviousData,
  })

  return {
    composingRangeOf: (path) => (composing?.path === path ? composing.range : null),
    isCommentPending: addComment.isPending || replyToThread.isPending || resolveThread.isPending || discardComment.isPending,
    isSubmitting: submitReview.isPending,
    isDiscarding: discardComment.isPending,
    submissionCount,
    submissionError: submitReview.error?.message ?? null,
    reviewerRequesting: {
      query: reviewerQuery,
      options: reviewers.data ?? null,
      isPending: requestReviewer.isPending || removeReviewRequest.isPending,
      onOpen: () => { setIsSearchingReviewers(true) },
      onSearch: setReviewerQuery,
      onRequest: (login) => { requestReviewer.mutate({ ...reviewKey, login }) },
      onRemove: (login) => { removeReviewRequest.mutate({ ...reviewKey, login }) },
    },
    onStartComment: (path, address, isExtending) => {
      setComposing((current) => composeAt(current, path, address, isExtending))
    },
    onStartRangeComment: (path, range) => {
      setComposing({ path, anchorLineLabel: range.startLineLabel, range })
    },
    onAddComment: (path, range, body) => {
      addComment.mutate({ ...reviewKey, position: positionOf(path, range), body, shouldPostNow: false })
    },
    onPostComment: (path, range, body) => {
      addComment.mutate({ ...reviewKey, position: positionOf(path, range), body, shouldPostNow: true })
    },
    onComment: (body) => { addComment.mutate({ ...reviewKey, position: null, body, shouldPostNow: true }) },
    onReply: (threadId, body) => { replyToThread.mutate({ ...reviewKey, threadId, body }) },
    onResolveThread: (threadId, isResolved) => { resolveThread.mutate({ ...reviewKey, threadId, isResolved }) },
    onDiscardComment: (commentId) => { discardComment.mutate({ ...reviewKey, commentId }) },
    onSubmit: (verdict, body) => { submitReview.mutate({ ...reviewKey, verdict, body }) },
  }
}
