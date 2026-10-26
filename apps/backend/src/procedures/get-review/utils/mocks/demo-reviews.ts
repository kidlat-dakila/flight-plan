import { z } from "zod"
import type { ConversationEvent } from "@/procedures/get-conversation/utils/conversation"
import type { Comment, CommentThread, Discussion } from "@/procedures/get-review/utils/discussion"
import type { SamplePullRequest } from "@/procedures/get-review/utils/pull-request-forge"
import type { ReviewKey, StoredReview } from "@/procedures/get-review/utils/review-store"
import type { Reviewer } from "@/procedures/get-review/utils/review-target-detail"
import { DEFAULT_ORDER, type ReviewRequest } from "@/procedures/get-review/utils/start/review-request"
import type { ReviewScaffold } from "@/procedures/get-review/utils/stored-review"
import { DEFAULT_EFFORT, DEFAULT_MODEL, type AgentName, type PresetName, type Setup } from "@/procedures/get-setup/utils/setup"
import type { PullRequestTarget, Repository } from "@/procedures/list-repositories/utils/repository"
import { reviewArtifactSchema, type ReviewArtifact } from "@flightplan/configurations"

const MS_PER_MINUTE = 60_000
const GITHUB_URL = "https://github.com"
const DEMO_PATH_PREFIX = "/Users/you/projects/"
const DEMO_VIEWER = "you"
const DEMO_AGENT_PATH = "/Users/you/.claude"
const DEMO_AGENT: AgentName = "claude"
const DEMO_CONFIGURATION: PresetName = "standard"
const COMMIT_LENGTH = 40
const DEMO_BASE_COMMIT = "1".repeat(COMMIT_LENGTH)

const timedSchema = z.strictObject({ minutesAgo: z.number().int().nonnegative() })

const commentSchema = timedSchema.extend({ author: z.string(), body: z.string() })

const demoStorySchema = z.strictObject({
  repository: z.strictObject({ name: z.string(), forgeSlug: z.string() }),
  pullRequest: z.strictObject({ number: z.number().int().positive(), author: z.string(), updatedMinutesAgo: z.number().int().nonnegative() }),
  reviewers: z.array(z.strictObject({ login: z.string(), state: z.enum(["pending", "commented", "approved", "changes-requested"]) })),
  comments: z.array(commentSchema),
  threads: z.array(
    z.strictObject({ path: z.string(), line: z.number().int().positive(), isResolved: z.boolean(), comments: z.array(commentSchema) }),
  ),
  reviews: z.array(commentSchema.extend({ verdict: z.enum(["comment", "approve", "request-changes"]) })),
  chat: z.array(timedSchema.extend({ from: z.enum(["reviewer", "agent"]), body: z.string() })),
  agentReplies: z.array(z.string()).min(1),
  avatars: z.record(z.string(), z.string()),
})

export type DemoStory = z.infer<typeof demoStorySchema>

const demoTargetSchema = z.object({
  title: z.string(),
  branch: z.string(),
  artifact: reviewArtifactSchema,
})

const demoReviewSchema = z.object({
  name: z.string(),
  targets: z.array(demoTargetSchema).min(1),
  story: demoStorySchema,
})

export interface DemoTarget {
  readonly title: string
  readonly branch: string
  readonly artifact: ReviewArtifact
}

export interface DemoReview {
  readonly name: string
  readonly targets: readonly [DemoTarget, ...DemoTarget[]]
  readonly story: DemoStory
}

export const parseDemoReview = (value: unknown): DemoReview => {
  const { name, targets: [first, ...rest], story } = demoReviewSchema.parse(value)
  return { name, targets: [first, ...rest], story }
}

const avatarOf = (story: DemoStory, login: string): string | null => story.avatars[login] ?? null

const minutesBefore = (now: Date, minutes: number): Date => new Date(now.getTime() - minutes * MS_PER_MINUTE)

const artifactOf = (demo: DemoReview): ReviewArtifact => demo.targets[0].artifact

const targetIdOf = (demo: DemoReview): string => `pr-${String(demo.story.pullRequest.number)}`

const pullRequestUrlOf = (demo: DemoReview): string =>
  `${GITHUB_URL}/${demo.story.repository.forgeSlug}/pull/${String(demo.story.pullRequest.number)}`

export const demoReviewKeyOf = (demo: DemoReview): ReviewKey => ({ repositoryName: demo.story.repository.name, targetId: targetIdOf(demo) })

export const demoReviewPathOf = (demo: DemoReview): string => `/pr-reviews/${demo.story.repository.name}/${targetIdOf(demo)}`

const toPullRequestTarget = (demo: DemoReview, now: Date): PullRequestTarget => ({
  kind: "pull-request",
  number: demo.story.pullRequest.number,
  title: demo.targets[0].title,
  branch: demo.targets[0].branch,
  author: demo.story.pullRequest.author,
  authorAvatarUrl: avatarOf(demo.story, demo.story.pullRequest.author),
  branchStatus: "awaiting-review",
  isNew: false,
  updatedAt: minutesBefore(now, demo.story.pullRequest.updatedMinutesAgo),
})

export const toDemoRepository = (demo: DemoReview, now: Date): Repository => ({
  name: demo.story.repository.name,
  path: `${DEMO_PATH_PREFIX}${demo.story.repository.name}`,
  forge: "gh",
  forgeSlug: demo.story.repository.forgeSlug,
  problem: null,
  targets: [toPullRequestTarget(demo, now)],
})

const toReviewer = (story: DemoStory, { login, state }: DemoStory["reviewers"][number]): Reviewer => ({
  login,
  name: login,
  avatarUrl: avatarOf(story, login),
  state,
})

export const toDemoStoredReview = (demo: DemoReview): StoredReview => ({
  key: demoReviewKeyOf(demo),
  artifact: artifactOf(demo),
  detail: {
    headCommit: artifactOf(demo).commit,
    forgeUrl: pullRequestUrlOf(demo),
    reviewers: demo.story.reviewers.map((reviewer) => toReviewer(demo.story, reviewer)),
    changedPaths: artifactOf(demo).changedPaths,
  },
})

export interface DemoScaffold {
  readonly key: ReviewKey
  readonly scaffold: ReviewScaffold
}

const toExplainedRequest = (demo: DemoReview, now: Date): ReviewRequest => ({
  configurationId: DEMO_CONFIGURATION,
  preset: DEMO_CONFIGURATION,
  order: DEFAULT_ORDER,
  customOrder: null,
  writer: { kind: "agent", agent: DEMO_AGENT, model: DEFAULT_MODEL, effort: DEFAULT_EFFORT },
  requestedAt: minutesBefore(now, demo.story.pullRequest.updatedMinutesAgo),
})

export const toDemoScaffold = (demo: DemoReview, now: Date): DemoScaffold => ({
  key: demoReviewKeyOf(demo),
  scaffold: { artifact: artifactOf(demo), request: toExplainedRequest(demo, now), baseCommit: DEMO_BASE_COMMIT },
})

const toComment = (story: DemoStory, id: string, comment: z.infer<typeof commentSchema>, now: Date): Comment => ({
  id,
  author: { name: comment.author, avatarUrl: avatarOf(story, comment.author) },
  body: comment.body,
  createdAt: minutesBefore(now, comment.minutesAgo),
})

const toThread = (story: DemoStory, thread: DemoStory["threads"][number], index: number, now: Date): CommentThread => ({
  id: `thread-${String(index + 1)}`,
  path: thread.path,
  position: { path: thread.path, side: "new", startLine: thread.line, endLine: thread.line },
  isResolved: thread.isResolved,
  isOutdated: false,
  comments: thread.comments.map((comment, commentIndex) => toComment(story, `thread-${String(index + 1)}-comment-${String(commentIndex + 1)}`, comment, now)),
})

const toDiscussion = (story: DemoStory, now: Date): Discussion => ({
  comments: story.comments.map((comment, index) => toComment(story, `comment-${String(index + 1)}`, comment, now)),
  threads: story.threads.map((thread, index) => toThread(story, thread, index, now)),
  reviews: story.reviews.map((review, index) => ({
    id: `review-${String(index + 1)}`,
    author: { name: review.author, avatarUrl: avatarOf(story, review.author) },
    verdict: review.verdict,
    body: review.body,
    createdAt: minutesBefore(now, review.minutesAgo),
  })),
})

export const toDemoPullRequest = (demo: DemoReview, now: Date): SamplePullRequest => ({
  repositoryName: demo.story.repository.name,
  number: demo.story.pullRequest.number,
  url: pullRequestUrlOf(demo),
  reviewers: demo.story.reviewers.map((reviewer) => toReviewer(demo.story, reviewer)),
  discussion: toDiscussion(demo.story, now),
})

const toChatEvents = (message: DemoStory["chat"][number], id: string, sequence: number, now: Date): readonly ConversationEvent[] => {
  const sentAt = minutesBefore(now, message.minutesAgo)
  return message.from === "agent"
    ? [{ kind: "agent-message", id, body: message.body, sentAt }]
    : [
        { kind: "reviewer-message", id, body: message.body, reference: null, excerpt: null, sentAt },
        { kind: "delivery", id: `${id}-delivery`, throughSequence: sequence, channel: "spawn", deliveredAt: sentAt },
      ]
}

export const toDemoChat = (demo: DemoReview, now: Date): readonly ConversationEvent[] =>
  demo.story.chat.reduce<readonly ConversationEvent[]>(
    (events, message, index) => [...events, ...toChatEvents(message, `demo-message-${String(index + 1)}`, events.length + 1, now)],
    [],
  )

const writtenAgentMessageCountOf = (story: DemoStory): number => story.chat.filter((message) => message.from === "agent").length

export const toDemoAgentReplies = (demo: DemoReview): readonly string[] => {
  const { agentReplies } = demo.story
  const offset = writtenAgentMessageCountOf(demo.story) % agentReplies.length
  return [...agentReplies.slice(agentReplies.length - offset), ...agentReplies.slice(0, agentReplies.length - offset)]
}

export const toDemoSetup = (demos: readonly DemoReview[]): Setup => ({
  agents: {
    installs: [{ agent: DEMO_AGENT, installPath: DEMO_AGENT_PATH, model: DEFAULT_MODEL, effort: DEFAULT_EFFORT }],
    defaultAgent: DEMO_AGENT,
  },
  forges: {
    connections: [{ forge: "gh", username: DEMO_VIEWER, baseUrl: GITHUB_URL, hasCredential: true }],
  },
  defaultConfiguration: DEMO_CONFIGURATION,
  repositories: demos.map((demo) => ({
    name: demo.story.repository.name,
    path: `${DEMO_PATH_PREFIX}${demo.story.repository.name}`,
    selfAuthor: null,
    trackedAuthors: [],
  })),
  reviewPreferences: null,
  isComplete: true,
})

export const DEMO_VIEWER_LOGIN = DEMO_VIEWER
