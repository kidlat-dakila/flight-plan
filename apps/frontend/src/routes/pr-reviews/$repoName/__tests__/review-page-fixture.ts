import { act } from "@testing-library/react"

const paragraph = (text: string) => [{ kind: "paragraph", inlines: [{ kind: "text", text }] }]

const codeLine = (numberLabel: string, text: string, mark = "context") => ({
  numberLabel,
  removedNumberLabel: "",
  mark,
  isFocused: false,
  tokens: [{ text, kind: "plain" }],
  marks: [],
  references: [],
})

const waypoint = (id: string, title: string, positionLabel: string, previousId: string | null, nextId: string | null, line: number) => ({
  id,
  anchorId: `waypoint-${id}`,
  depth: 0,
  title,
  isDraft: false,
  positionLabel,
  previousId,
  nextId,
  chip: null,
  attentionLabel: null,
  reading: paragraph(`Reading of ${title}.`),
  unwrittenLabel: "Not written yet.",
  needsAttention: null,
  findings: [],
  isReviewed: false,
  reviewLabel: "Reviewed",
  lines: { lineStart: line, lineEnd: line },
  text: { title, reading: `Reading of ${title}.`, needsAttention: null },
})

interface OrderedFile {
  readonly path: string
  readonly title: string
  readonly waypointCountLabel: string
}

const fileOrderOf = (files: readonly OrderedFile[]) =>
  files.map((file, position) => ({
    path: file.path,
    heading: file.title,
    detailLabel: file.waypointCountLabel,
    canMoveUp: position > 0,
    canMoveDown: position < files.length - 1,
  }))

export const NO_OFFERS = { journey: null, blast: null, findings: null }

export const offerOf = (section: "journey" | "blast" | "findings", heading: string) => ({
  section,
  anchorId: `stock-${section}`,
  heading,
  message: `${heading} was not generated.`,
  generateLabel: "Generate",
  generatingLabel: "Generating",
})

const ABSENT_JOURNEY = { anchorId: "", heading: "Journey Flow Diagram", diagram: null }

const segment = (id: string, title: string | null, position: number, files: readonly OrderedFile[]) => ({
  id,
  anchorId: `segment-${id}`,
  title,
  heading: title === null ? null : `Segment ${String(position)}: ${title}`,
  isTitleDraft: false,
  detailLabel: title === null ? null : "1 file",
  outline: {
    heading: `Segment ${String(position)}: ${title ?? id}`,
    detailLabel: "1 file",
    label: title ?? id,
    paths: [`src/${id}.ts`],
    canMoveUp: position > 1,
    canMoveDown: position < 2,
  },
  context: {
    anchorId: `${id}-context`,
    heading: "Context",
    context: paragraph(`Why ${id} matters.`),
    markdown: `Why ${id} matters.`,
    isDraft: false,
    unwrittenLabel: "Not written yet.",
  },
  journey: { ...ABSENT_JOURNEY, anchorId: `${id}-journey-flow-diagram` },
  blast: null,
  offers: NO_OFFERS,
  walkthrough: {
    anchorId: `${id}-code-walkthrough`,
    heading: "Code Walkthrough",
    intro: null,
    coverageLabel: "All 1 changed file",
    emptyMessage: null,
    files,
    fileOrder: fileOrderOf(files),
  },
})

const priceFile = {
  anchorId: "stock-file-1",
  path: "src/price.ts",
  title: "Price file",
  isDraft: false,
  isReviewed: false,
  reviewLabel: "File reviewed",
  summary: [],
  waypointCountLabel: "1 waypoint",
  forgeLink: null,
  rows: [
    { kind: "waypoint", id: "waypoint-price-of", waypoint: waypoint("price-of", "Held units reduce the price", "1 of 2", null, "subtotal", 11) },
    { kind: "lines", id: "lines-0", lines: [codeLine("11", "export const priceOf = () => 1", "added")] },
  ],
  threads: [
    {
      id: "thread-1",
      side: "new",
      lineLabel: "11",
      startLineLabel: "11",
      rangeLabel: null,
      statusLabel: null,
      resolution: { label: "Resolve conversation", isResolving: true },
      canReply: true,
      comments: [
        {
          id: "comment-1",
          author: { name: "amara", avatarUrl: null, monogram: "A" },
          body: paragraph("Can this go negative?"),
          timeLabel: "2 hours ago",
          pendingLabel: null,
          discardLabel: null,
        },
      ],
    },
  ],
}

const cartFile = {
  anchorId: "checkout-file-1",
  path: "src/cart.ts",
  title: "Cart file",
  isDraft: false,
  isReviewed: false,
  reviewLabel: "File reviewed",
  summary: [],
  waypointCountLabel: "1 waypoint",
  forgeLink: null,
  rows: [
    { kind: "waypoint", id: "waypoint-subtotal", waypoint: waypoint("subtotal", "The sum is rounded once", "2 of 2", "price-of", null, 3) },
    { kind: "lines", id: "lines-0", lines: [codeLine("3", "export const subtotal = () => 2")] },
  ],
  threads: [],
}

const shell = {
  documentTitle: "Count held units • storefront",
  lineColor: "blue",
  notice: "Sample data.",
  authorLabel: null,
  header: {
    kind: "pull-request",
    title: "Count held units in the stock check",
    author: { name: "mira", avatarUrl: null, monogram: "M" },
    status: "awaiting-review",
    statusLabel: "Awaiting review",
    artifactFreshness: { label: "Updated", isOutOfDate: false },
    reviewers: [
      {
        name: "jonas",
        avatarUrl: null,
        monogram: "J",
        state: "approved",
        stateLabel: "jonas approved",
        request: { login: "jonas", label: "Request a review from jonas again", isRemoving: false },
      },
    ],
    reviewersEmptyLabel: null,
    reviewerRequest: {
      buttonLabel: "Request a reviewer",
      heading: "Request a reviewer",
      searchPlaceholder: "Search people",
      emptyLabel: "Nobody matches.",
      requestLabel: "Request",
    },
    forgeLink: { href: "https://forge.test/pull/412", label: "View pull request" },
  },
}

const filterOption = (key: string, label: string, isSelected: boolean, toggledKeys: readonly string[]) => ({
  key,
  label,
  countLabel: "1 waypoint",
  isSelected,
  toggledKeys,
})

export const pendingComment = { id: "pending-1", locationLabel: "src/cart.ts, line 3", excerpt: "Round here?", staleLabel: null, discardLabel: "Discard" }

export const typeInto = (editorBox: HTMLElement, text: string): void => {
  const editor: unknown = Reflect.get(editorBox, "editor")
  const commands: unknown = typeof editor === "object" && editor !== null ? Reflect.get(editor, "commands") : null
  const insertContent: unknown = typeof commands === "object" && commands !== null ? Reflect.get(commands, "insertContent") : null
  if (typeof insertContent !== "function") throw new Error("This box is not a text editor.")
  act(() => {
    Reflect.apply(insertContent, commands, [text])
  })
}

export const artifactPage = {
  kind: "artifact",
  shell,
  isOwn: false,
  completeAction: null,
  staleNotice: null,
  progress: null,
  completion: null,
  unassignedFiles: null,
  rail: {
    groups: [
      { anchorId: "segment-stock", label: "Stock check (1/2)", detailLabel: "1 file", sections: [{ anchorId: "stock-context", kind: "context", label: "Context", children: [] }] },
      { anchorId: "segment-checkout", label: "Checkout (2/2)", detailLabel: "1 file", sections: [{ anchorId: "checkout-context", kind: "context", label: "Context", children: [] }] },
    ],
    sections: [{ anchorId: "conversation", kind: "conversation", label: "Conversation", children: [] }],
  },
  segments: [segment("stock", "Stock check", 1, [priceFile]), segment("checkout", "Checkout", 2, [cartFile])],
  walkthroughControls: {
    filter: {
      buttonLabel: "Filter: all waypoints",
      isDefault: true,
      resetLabel: "Show all waypoints",
      options: [filterOption("attention", "Needs Attention", false, ["attention"]), filterOption("bug", "Bug", false, ["bug"])],
    },
    reviewedToggle: { label: "Show reviewed (0)", isShown: false, isAvailable: false },
    stepping: {
      firstWaypointId: "price-of",
      lastWaypointId: "subtotal",
      idleLabel: "2 waypoints",
      previousLabel: "Previous waypoint (K)",
      nextLabel: "Next waypoint (J)",
    },
  },
  conversation: {
    anchorId: "conversation",
    heading: "Conversation",
    emptyMessage: null,
    entries: [
      {
        id: "review-1",
        author: { name: "jonas", avatarUrl: null, monogram: "J" },
        verdict: "approve",
        verdictLabel: "Approved",
        body: paragraph("The direction is right."),
        timeLabel: "3 hours ago",
        pendingLabel: null,
        discardLabel: null,
        locationLabel: null,
      },
    ],
  },
  composer: {
    addLabel: "Add a comment on this line",
    placeholder: "Leave a comment",
    replyPlaceholder: "Reply",
    submitLabel: "Add to review",
    postNowLabel: "Add single comment",
    replyLabel: "Reply",
    commentLabel: "Comment",
    cancelLabel: "Cancel",
    rangeHint: "Shift-click the + of another line to comment on a range.",
  },
  reviewDraft: {
    isAvailable: true,
    unavailableReason: null,
    buttonLabel: "Submit review",
    heading: "Submit your review",
    pendingLabel: "No pending comments.",
    pendingComments: [],
    bodyPlaceholder: "Leave a summary for the author",
    submitLabel: "Submit review",
    verdicts: [{ key: "comment", label: "Comment", description: "Send your comments without a verdict." }],
  },
  sharing: {
    buttonLabel: "Share",
    options: [
      { key: "claude", label: "Publish as a Claude artifact", description: "Publishes it.", actionLabel: "Publish", pendingLabel: "Publishing…", isPending: false, isAvailable: true, statusLabel: null, link: null },
    ],
  },
  chatLabel: "Chat",
  codeLinks: {},
  codeDefinitions: {},
}

const plain = (text: string) => ({ text, kind: "plain" })

const changedFiles = [plain("10 changed files"), plain("4 TypeScript"), plain("2 TSX")]

const configurationOption = (preset: string, label: string, tagLabel: string | null) => ({
  preset,
  label,
  tagLabel,
  bestFor: `Best for ${label}.`,
  description: `The agent writes the ${label} review.`,
  note: null,
  rewriteNotice: null as string | null,
})

const orderOption = (order: string, label: string, tagLabel: string | null = null) => ({
  order,
  label,
  tagLabel,
  summary: `${label}, in short.`,
  description: `${label}, described.`,
  promptField: null,
})

const blastFile = (path: string, label: string, x: number) => ({
  id: path,
  x,
  y: 80,
  radius: 6,
  mark: "plain",
  markLabel: "Not assessed",
  label,
  path,
  impactReason: null,
  impactNote: "Nobody has assessed what the change does to this file.",
  isUnassessed: true,
  assessment: { impactType: "unassessed", impactReason: "" },
  importers: { heading: "Imported by 0 files", emptyLabel: "No file of this segment imports it.", files: [] },
  imports: { heading: "Imports 0 files", emptyLabel: "It imports no file of this segment.", files: [] },
  fileLink: null,
})

const stockBlast = {
  anchorId: "stock-blast-diagram",
  heading: "Blast Diagram",
  viewsLabel: "View of the Blast Diagram",
  defaultViewId: "export-bound",
  assessmentForm: {
    editLabel: "Edit impact",
    impactTypeLabel: "Impact",
    impactReasonLabel: "Reason",
    choices: [
      { value: "unassessed", label: "Not assessed", hasReason: false },
      { value: "breaks", label: "Breaks", hasReason: true },
      { value: "behaviour-changes", label: "Behaviour changes", hasReason: true },
      { value: "unaffected", label: "Unaffected", hasReason: false },
    ],
  },
  views: [{
    id: "export-bound",
    label: "Export bound",
    description: "Export bound: the files that use what the change changed",
    summary: ["2 files", "1 changed", "1 import", "1 not assessed"],
    legend: [{ mark: "modified", label: "Modified file" }, { mark: "plain", label: "File the change did not touch" }],
    edgeLegendLabel: "An arrow points at the file that is imported",
    board: {
      width: 700,
      height: 300,
      nodes: [
        { ...blastFile("src/price.ts", "price.ts", 120), mark: "modified", markLabel: "Modified", impactNote: null, isUnassessed: false, assessment: null },
        blastFile("src/report.ts", "report.ts", 320),
      ],
      edges: [{ id: "src/report.ts>src/price.ts", importerId: "src/report.ts", importedId: "src/price.ts", points: [{ x: 310, y: 80 }, { x: 132, y: 80 }] }],
    },
  }],
}

export const twoFilePage = {
  ...artifactPage,
  segments: [segment("stock", "Stock check", 1, [priceFile, cartFile]), segment("checkout", "Checkout", 2, [])],
}

export const blastPage = {
  ...artifactPage,
  segments: artifactPage.segments.map((held) => (held.id === "stock" ? { ...held, blast: stockBlast } : held)),
}

export const unassignedFiles = {
  label: "1 file in no segment",
  message: "1 changed file is in no segment of this Flight Plan.",
  actionLabel: "Show the files",
  title: "Changed files in no segment",
  description: "No segment of this Flight Plan holds these changed files, so nothing in it describes them.",
  publishWarning: "1 changed file is in no segment. The reviewer is told so when they open the Flight Plan.",
  paths: ["src/rates.ts"],
}

export const missingPage = {
  kind: "missing",
  shell,
  isOwn: false,
  heading: "No Flight Plan Review yet",
  message: "Choose how the review is written, then start it.",
  changedFiles,
  form: {
    configuration: {
      heading: "Configuration",
      hint: "How the agent writes the review.",
      dialogTitle: "Choose a configuration",
      dialogDescription: "Only how the review is written changes.",
      chooseLabel: "Choose",
      cancelLabel: "Cancel",
      selectedPreset: "standard",
      options: [configurationOption("standard", "Standard", "Default"), configurationOption("onboardee", "Onboardee", null)],
    },
    order: {
      heading: "Order of the Code Walkthrough",
      hint: "The order the agent puts the changed files in.",
      dialogTitle: "Choose the order of the Code Walkthrough",
      dialogDescription: "Only which file comes first changes.",
      chooseLabel: "Choose",
      cancelLabel: "Cancel",
      selectedOrder: "foundations-first",
      customOrder: "",
      options: [
        orderOption("foundations-first", "Foundations first", "Default"),
        orderOption("risk-first", "Risk first"),
        {
          ...orderOption("custom", "Custom"),
          promptField: { label: "Your instruction for the order", placeholder: "For example: the migration first." },
        },
      ],
    },
    writer: {
      heading: "Agent",
      hint: "Who writes the review.",
      selectedKey: "claude",
      agents: [
        {
          agent: "claude",
          label: "Claude",
          description: "Flight Plan starts Claude in this repository.",
          unavailableReason: null,
          modelLegend: "Model for Claude",
          effortLegend: "Effort for Claude",
          hasModelChoice: true,
          modelOptions: [
            {
              model: "default",
              label: "Default (recommended)",
              hasEffortChoice: true,
              effortOptions: [{ effort: "default", label: "Default" }, { effort: "high", label: "High" }],
              selectedEffort: "default",
            },
            {
              model: "opus",
              label: "Opus 5.5",
              hasEffortChoice: true,
              effortOptions: [
                { effort: "default", label: "Default" },
                { effort: "high", label: "High" },
                { effort: "xhigh", label: "Extra high" },
              ],
              selectedEffort: "default",
            },
            {
              model: "haiku",
              label: "Haiku 4.5",
              hasEffortChoice: false,
              effortOptions: [{ effort: "default", label: "Default" }],
              selectedEffort: "default",
            },
          ],
          selectedModel: "default",
          selectedEffort: "default",
          submitLabel: "Start the review",
        },
        {
          agent: "codex",
          label: "Codex",
          description: "Flight Plan starts Codex in this repository.",
          unavailableReason: "Flight Plan cannot start Codex yet. Prompt it yourself instead.",
          modelLegend: "Model for Codex",
          effortLegend: "Effort for Codex",
          hasModelChoice: false,
          modelOptions: [
            {
              model: "default",
              label: "Your Codex default",
              hasEffortChoice: false,
              effortOptions: [{ effort: "default", label: "Default" }],
              selectedEffort: "default",
            },
          ],
          selectedModel: "default",
          selectedEffort: "default",
          submitLabel: "Start the review",
        },
      ],
      manual: {
        label: "I will prompt my agent myself",
        description: "Flight Plan copies the prompt.",
        submitLabel: "Copy the prompt",
      },
    },
    pendingLabel: "Starting…",
  },
}

export const conversationReply = {
  heading: "Chat with the agent",
  closeLabel: "Close the chat",
  emptyMessage: "Ask about this review.",
  placeholder: "Ask about this review",
  sendLabel: "Send",
  agentState: "not-running",
  agentStateLabel: "Agent not running",
  problem: null,
  entries: [],
}

export const permissionReply = {
  ...conversationReply,
  emptyMessage: null,
  agentState: "waiting-for-reviewer",
  agentStateLabel: "Agent waiting for your answers",
  entries: [
    {
      kind: "questions",
      id: "p1",
      isPermission: true,
      heading: "The agent asks for permission",
      timeLabel: "just now",
      status: "open",
      statusLabel: "Waiting for your answer",
      submitLabel: "Send",
      questions: [
        {
          id: "p1-1",
          prompt: "Allow the agent to use Bash?",
          detail: "pnpm test",
          allowsMultiple: false,
          options: [
            { label: "Allow", description: "Let the agent run it this time." },
            { label: "Deny", description: "Refuse, and tell the agent why if you write an answer." },
          ],
          textLabel: "Why, for the agent (optional)",
          answerLabel: null,
        },
      ],
    },
  ],
}

export const modelChoiceReply = {
  label: "Model for Claude",
  hint: "The agent uses it from its next turn.",
  selectedModel: "opus",
  options: [{ value: "opus", label: "Opus" }, { value: "haiku", label: "Haiku" }],
}

const ownShell = { ...shell, authorLabel: "Your Flight Plan" }

const OWN_ARTIFACT_PARTS = { isOwn: true, shell: ownShell, conversation: null, composer: null, reviewDraft: null }

export const ownArtifactPage = { ...artifactPage, ...OWN_ARTIFACT_PARTS }

export const ownTwoFilePage = { ...twoFilePage, ...OWN_ARTIFACT_PARTS }

export const ownBlastPage = { ...blastPage, ...OWN_ARTIFACT_PARTS }

export const ownMissingPage = { ...missingPage, isOwn: true, shell: ownShell }
