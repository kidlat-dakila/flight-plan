import {
  REVIEWER_NAME,
  type Comment,
  type CommentThread,
  type Discussion,
} from "@/procedures/get-review/utils/discussion"

export interface NewComment {
  readonly threadId: string | null
  readonly location: { readonly path: string, readonly line: number } | null
  readonly body: string
}

export interface AppendedComment {
  readonly discussion: Discussion
  readonly threadId: string
}

const commentCount = (discussion: Discussion): number =>
  discussion.threads.reduce((total, thread) => total + thread.comments.length, 0)

const toComment = (discussion: Discussion, body: string, now: Date): Comment => ({
  id: `comment-${String(commentCount(discussion) + 1)}`,
  author: REVIEWER_NAME,
  body,
  createdAt: now,
  isPending: true,
})

const withReply = (discussion: Discussion, thread: CommentThread, comment: Comment): AppendedComment => ({
  threadId: thread.id,
  discussion: {
    ...discussion,
    threads: discussion.threads.map((stored) =>
      stored.id === thread.id ? { ...stored, comments: [...stored.comments, comment] } : stored),
  },
})

const withThread = (discussion: Discussion, comment: Comment, location: NewComment["location"]): AppendedComment => {
  const threadId = `thread-${String(discussion.threads.length + 1)}`
  return {
    threadId,
    discussion: {
      ...discussion,
      threads: [
        ...discussion.threads,
        { id: threadId, path: location?.path ?? null, line: location?.line ?? null, comments: [comment] },
      ],
    },
  }
}

export const appendComment = (discussion: Discussion, added: NewComment, now: Date): AppendedComment | null => {
  const comment = toComment(discussion, added.body, now)
  if (added.threadId === null) return withThread(discussion, comment, added.location)
  const thread = discussion.threads.find((stored) => stored.id === added.threadId)
  return thread === undefined ? null : withReply(discussion, thread, comment)
}
