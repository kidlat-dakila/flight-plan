import { z } from "zod"
import { modelOptionSchema } from "@/procedures/get-setup/utils/schemas"
import { AGENT_NAMES, PRESET_NAMES } from "@/procedures/get-setup/utils/setup"
import { BRANCH_STATUSES } from "@/procedures/list-repositories/utils/branch-status"
import { LINE_COLORS } from "@/procedures/list-repositories/utils/line-color"
import { labelSegmentSchema } from "@/procedures/list-repositories/utils/schemas"
import { targetOptionSchema } from "@/procedures/search-creation-targets/utils/schemas"
import {
  blastBandSchema,
  codeDefinitionSchema,
  codeLinkSchema,
  fileSectionSchema,
  inlinesSchema,
  journeyBandSchema,
  linkSchema,
  proseSchema,
  walkthroughBandSchema,
  walkthroughControlsSchema,
} from "@flightplan/configurations"
import { MANUAL_WRITER } from "./start/agent-offers"
import { WALKTHROUGH_ORDERS } from "./start/review-request"

export const REVIEWER_STATES = ["pending", "commented", "approved", "changes-requested"] as const
export const SECTION_KINDS = ["context", "journey", "blast", "walkthrough", "conversation"] as const

const personSchema = z.strictObject({
  name: z.string(),
  avatarUrl: z.string().nullable(),
  monogram: z.string(),
})

export const artifactFreshnessSchema = z.strictObject({
  label: z.string(),
  isOutOfDate: z.boolean(),
})

export const reviewHeaderSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("pull-request"),
    title: z.string(),
    author: personSchema,
    status: z.enum(BRANCH_STATUSES),
    statusLabel: z.string(),
    artifactFreshness: artifactFreshnessSchema.nullable(),
    reviewers: z.array(
      z.strictObject({
        name: z.string(),
        avatarUrl: z.string().nullable(),
        monogram: z.string(),
        state: z.enum(REVIEWER_STATES),
        stateLabel: z.string(),
      }),
    ),
    reviewersEmptyLabel: z.string().nullable(),
    forgeLink: linkSchema.nullable(),
  }),
  z.strictObject({
    kind: z.literal("branch"),
    branch: z.string(),
    forgeMessage: z.string(),
    artifactFreshness: artifactFreshnessSchema.nullable(),
    action: linkSchema,
  }),
])

const shellSchema = z.strictObject({
  documentTitle: z.string(),
  lineColor: z.enum(LINE_COLORS),
  header: reviewHeaderSchema,
  authorLabel: z.string().nullable(),
  notice: z.string().nullable(),
})

export const staleNoticeSchema = z.strictObject({
  message: inlinesSchema,
  promptLabel: z.string(),
  prompt: z.string(),
  copiedMessage: z.string(),
})

export const PROGRESS_STATES = ["writing", "waiting", "stopped"] as const

export const reviewProgressSchema = z.strictObject({
  state: z.enum(PROGRESS_STATES),
  label: z.string(),
  message: z.string(),
  isWriting: z.boolean(),
  countLabel: z.string(),
  writtenCount: z.number().int(),
  totalCount: z.number().int(),
  prompt: z.strictObject({ label: z.string(), text: z.string(), copiedMessage: z.string() }).nullable(),
})

export const completionNoticeSchema = z.strictObject({ title: z.string(), body: z.string() })

const railSectionSchema = z.strictObject({
  anchorId: z.string(),
  kind: z.enum(SECTION_KINDS),
  label: z.string(),
  children: z.array(z.strictObject({ anchorId: z.string(), label: z.string() })),
})

export const railSchema = z.strictObject({
  groups: z.array(
    z.strictObject({
      anchorId: z.string(),
      label: z.string().nullable(),
      detailLabel: z.string().nullable(),
      sections: z.array(railSectionSchema),
    }),
  ),
  sections: z.array(railSectionSchema),
})

export const contextBandSchema = z.strictObject({
  anchorId: z.string(),
  heading: z.string(),
  context: proseSchema,
  markdown: z.string(),
  isDraft: z.boolean(),
  unwrittenLabel: z.string(),
})

export const REVIEW_VERDICTS = ["comment", "approve", "request-changes"] as const
export const PUBLICATION_KINDS = ["description", "claude"] as const

export const commentSchema = z.strictObject({
  id: z.string(),
  author: personSchema,
  body: proseSchema,
  timeLabel: z.string(),
  pendingLabel: z.string().nullable(),
})

export const threadSchema = z.strictObject({
  id: z.string(),
  lineLabel: z.string(),
  comments: z.array(commentSchema),
})

export const composerLabelsSchema = z.strictObject({
  addLabel: z.string(),
  placeholder: z.string(),
  replyPlaceholder: z.string(),
  submitLabel: z.string(),
  cancelLabel: z.string(),
})

export const discussedFileSectionSchema = fileSectionSchema.extend({ threads: z.array(threadSchema) })

export const discussedWalkthroughBandSchema = walkthroughBandSchema.extend({ files: z.array(discussedFileSectionSchema) })

export const segmentOutlineSchema = z.strictObject({
  heading: z.string(),
  detailLabel: z.string(),
  label: z.string(),
  paths: z.array(z.string()),
  canMoveUp: z.boolean(),
  canMoveDown: z.boolean(),
})

export const unassignedFilesSchema = z.strictObject({
  label: z.string(),
  message: z.string(),
  actionLabel: z.string(),
  title: z.string(),
  description: z.string(),
  publishWarning: z.string(),
  paths: z.array(z.string()),
})

export const segmentViewSchema = z.strictObject({
  id: z.string(),
  anchorId: z.string(),
  title: z.string().nullable(),
  heading: z.string().nullable(),
  isTitleDraft: z.boolean(),
  detailLabel: z.string().nullable(),
  outline: segmentOutlineSchema,
  context: contextBandSchema,
  journey: journeyBandSchema,
  blast: blastBandSchema.nullable(),
  walkthrough: discussedWalkthroughBandSchema,
})

export const conversationBandSchema = z.strictObject({
  anchorId: z.string(),
  heading: z.string(),
  threadId: z.string().nullable(),
  emptyMessage: z.string().nullable(),
  entries: z.array(
    z.strictObject({
      id: z.string(),
      author: personSchema,
      verdict: z.enum(REVIEW_VERDICTS).nullable(),
      verdictLabel: z.string().nullable(),
      body: proseSchema,
      timeLabel: z.string(),
      pendingLabel: z.string().nullable(),
    }),
  ),
})

export const reviewDraftSchema = z.strictObject({
  isAvailable: z.boolean(),
  unavailableReason: z.string().nullable(),
  buttonLabel: z.string(),
  heading: z.string(),
  pendingLabel: z.string(),
  bodyPlaceholder: z.string(),
  submitLabel: z.string(),
  verdicts: z.array(z.strictObject({ key: z.enum(REVIEW_VERDICTS), label: z.string(), description: z.string() })),
})

export const sharingSchema = z.strictObject({
  buttonLabel: z.string(),
  options: z.array(
    z.strictObject({
      key: z.enum(PUBLICATION_KINDS),
      label: z.string(),
      description: z.string(),
      actionLabel: z.string(),
      isAvailable: z.boolean(),
      statusLabel: z.string().nullable(),
      link: linkSchema.nullable(),
    }),
  ),
})

export const pullRequestChoiceSchema = z.strictObject({
  title: z.string(),
  description: z.string(),
  emptyMessage: z.string().nullable(),
  options: z.array(targetOptionSchema),
  selectedId: z.string().nullable(),
  confirmLabel: z.string(),
  skipLabel: z.string(),
  cancelLabel: z.string(),
})

export const completeActionSchema = z.strictObject({
  label: z.string(),
  pullRequestChoice: pullRequestChoiceSchema.nullable(),
})

export const startFormSchema = z.strictObject({
  configuration: z.strictObject({
    heading: z.string(),
    hint: z.string(),
    dialogTitle: z.string(),
    dialogDescription: z.string(),
    chooseLabel: z.string(),
    cancelLabel: z.string(),
    selectedPreset: z.enum(PRESET_NAMES),
    options: z.array(
      z.strictObject({
        preset: z.enum(PRESET_NAMES),
        label: z.string(),
        tagLabel: z.string().nullable(),
        bestFor: z.string(),
        description: z.string(),
        note: z.string().nullable(),
        rewriteNotice: z.string().nullable(),
      }),
    ),
  }),
  order: z.strictObject({
    heading: z.string(),
    hint: z.string(),
    dialogTitle: z.string(),
    dialogDescription: z.string(),
    chooseLabel: z.string(),
    cancelLabel: z.string(),
    selectedOrder: z.enum(WALKTHROUGH_ORDERS),
    customOrder: z.string(),
    options: z.array(
      z.strictObject({
        order: z.enum(WALKTHROUGH_ORDERS),
        label: z.string(),
        tagLabel: z.string().nullable(),
        summary: z.string(),
        description: z.string(),
        promptField: z.strictObject({ label: z.string(), placeholder: z.string() }).nullable(),
      }),
    ),
  }),
  writer: z.strictObject({
    heading: z.string(),
    hint: z.string(),
    selectedKey: z.enum([...AGENT_NAMES, MANUAL_WRITER]),
    agents: z.array(
      z.strictObject({
        agent: z.enum(AGENT_NAMES),
        label: z.string(),
        description: z.string(),
        unavailableReason: z.string().nullable(),
        modelLegend: z.string(),
        effortLegend: z.string(),
        hasModelChoice: z.boolean(),
        modelOptions: z.array(modelOptionSchema),
        selectedModel: z.string(),
        selectedEffort: z.string(),
        submitLabel: z.string(),
      }),
    ),
    manual: z.strictObject({ label: z.string(), description: z.string(), submitLabel: z.string() }),
  }),
  pendingLabel: z.string(),
})

export const reviewPageSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("missing"),
    shell: shellSchema,
    isOwn: z.boolean(),
    heading: z.string(),
    message: z.string(),
    changedFiles: z.array(labelSegmentSchema),
    form: startFormSchema,
  }),
  z.strictObject({
    kind: z.literal("artifact"),
    shell: shellSchema,
    isOwn: z.boolean(),
    completeAction: completeActionSchema.nullable(),
    staleNotice: staleNoticeSchema.nullable(),
    progress: reviewProgressSchema.nullable(),
    completion: completionNoticeSchema.nullable(),
    unassignedFiles: unassignedFilesSchema.nullable(),
    rail: railSchema,
    segments: z.array(segmentViewSchema),
    walkthroughControls: walkthroughControlsSchema,
    conversation: conversationBandSchema.nullable(),
    composer: composerLabelsSchema.nullable(),
    reviewDraft: reviewDraftSchema.nullable(),
    sharing: sharingSchema.nullable(),
    chatLabel: z.string(),
    codeLinks: z.record(z.string(), codeLinkSchema),
    codeDefinitions: z.record(z.string(), codeDefinitionSchema),
  }),
])

export const getReviewInputSchema = z.strictObject({
  repositoryName: z.string(),
  targetId: z.string(),
  filterKeys: z.array(z.string()).nullable(),
  isShowingReviewed: z.boolean(),
})

export type StartForm = z.infer<typeof startFormSchema>
export type ArtifactFreshness = z.infer<typeof artifactFreshnessSchema>
export type ReviewHeader = z.infer<typeof reviewHeaderSchema>
export type ReviewShell = z.infer<typeof shellSchema>
export type StaleNotice = z.infer<typeof staleNoticeSchema>
export type ReviewProgress = z.infer<typeof reviewProgressSchema>
export type CompletionNotice = z.infer<typeof completionNoticeSchema>
export type Rail = z.infer<typeof railSchema>
export type ContextBand = z.infer<typeof contextBandSchema>
export type SegmentOutline = z.infer<typeof segmentOutlineSchema>
export type UnassignedFiles = z.infer<typeof unassignedFilesSchema>
export type SegmentView = z.infer<typeof segmentViewSchema>
export type DiscussedFileSection = z.infer<typeof discussedFileSectionSchema>
export type DiscussedWalkthroughBand = z.infer<typeof discussedWalkthroughBandSchema>
export type ThreadView = z.infer<typeof threadSchema>
export type ConversationBand = z.infer<typeof conversationBandSchema>
export type ReviewDraft = z.infer<typeof reviewDraftSchema>
export type CompleteAction = z.infer<typeof completeActionSchema>
export type Sharing = z.infer<typeof sharingSchema>
export type ReviewPage = z.infer<typeof reviewPageSchema>
export type GetReviewInput = z.infer<typeof getReviewInputSchema>
