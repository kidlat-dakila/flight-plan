const paragraph = (text: string) => [{ kind: "paragraph", inlines: [{ kind: "text", text }] }]

const codeLine = (numberLabel: string, text: string, mark = "context") => ({
  numberLabel,
  mark,
  isFocused: false,
  tokens: [{ text, kind: "plain" }],
})

const waypoint = (id: string, title: string, positionLabel: string, previousId: string | null, nextId: string | null) => ({
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
})

const NO_CONFIGURATION = { anchorId: "", heading: "Journey Flow Diagram", absence: paragraph("Nothing starts it."), configuration: null, legend: [], diagram: null }

const segment = (id: string, title: string | null, position: number, files: readonly unknown[]) => ({
  id,
  anchorId: `segment-${id}`,
  title,
  heading: title === null ? null : `Segment ${String(position)}: ${title}`,
  detailLabel: title === null ? null : "1 file",
  context: {
    anchorId: `${id}-context`,
    heading: "Context",
    context: paragraph(`Why ${id} matters.`),
  },
  journey: { ...NO_CONFIGURATION, anchorId: `${id}-journey-flow-diagram` },
  blast: null,
  walkthrough: {
    anchorId: `${id}-code-walkthrough`,
    heading: "Code Walkthrough",
    intro: null,
    coverageLabel: "All 1 changed file",
    emptyMessage: null,
    files,
  },
})

const priceFile = {
  anchorId: "stock-file-1",
  path: "src/price.ts",
  title: "Price file",
  isReviewed: false,
  reviewLabel: "File reviewed",
  summary: [],
  waypointCountLabel: "1 waypoint",
  forgeLink: null,
  rows: [
    { kind: "waypoint", id: "waypoint-price-of", waypoint: waypoint("price-of", "Held units reduce the price", "1 of 2", null, "subtotal") },
    { kind: "lines", id: "lines-0", lines: [codeLine("11", "export const priceOf = () => 1", "added")] },
  ],
  threads: [
    {
      id: "thread-1",
      lineLabel: "11",
      comments: [
        { id: "comment-1", author: { name: "amara", avatarUrl: null, monogram: "A" }, body: paragraph("Can this go negative?"), timeLabel: "2 hours ago", pendingLabel: null },
      ],
    },
  ],
}

const cartFile = {
  anchorId: "checkout-file-1",
  path: "src/cart.ts",
  title: "Cart file",
  isReviewed: false,
  reviewLabel: "File reviewed",
  summary: [],
  waypointCountLabel: "1 waypoint",
  forgeLink: null,
  rows: [
    { kind: "waypoint", id: "waypoint-subtotal", waypoint: waypoint("subtotal", "The sum is rounded once", "2 of 2", "price-of", null) },
    { kind: "lines", id: "lines-0", lines: [codeLine("3", "export const subtotal = () => 2")] },
  ],
  threads: [],
}

const shell = {
  documentTitle: "Count held units • storefront",
  lineColor: "blue",
  notice: "Sample data.",
  header: {
    kind: "pull-request",
    title: "Count held units in the stock check",
    author: { name: "mira", avatarUrl: null, monogram: "M" },
    status: "awaiting-review",
    statusLabel: "Awaiting review",
    artifactFreshness: { label: "Updated", isOutOfDate: false },
    reviewers: [{ name: "jonas", avatarUrl: null, monogram: "J", state: "approved", stateLabel: "jonas approved" }],
    reviewersEmptyLabel: null,
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

export const artifactPage = {
  kind: "artifact",
  shell,
  staleNotice: null,
  draftingNotice: null,
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
    threadId: null,
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
      },
    ],
  },
  composer: {
    addLabel: "Add a comment on this line",
    placeholder: "Leave a comment",
    replyPlaceholder: "Reply",
    submitLabel: "Add to review",
    cancelLabel: "Cancel",
  },
  reviewDraft: {
    isAvailable: true,
    unavailableReason: null,
    buttonLabel: "Submit review",
    heading: "Submit your review",
    pendingLabel: "No pending comments.",
    bodyPlaceholder: "Leave a summary for the author",
    submitLabel: "Submit review",
    verdicts: [{ key: "comment", label: "Comment", description: "Send your comments without a verdict." }],
  },
  sharing: {
    buttonLabel: "Share",
    options: [
      { key: "claude", label: "Publish as a Claude artifact", description: "Publishes it.", actionLabel: "Publish", isAvailable: true, statusLabel: null, link: null },
    ],
  },
  chatLabel: "Chat",
  codeLinks: {},
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
})

const orderOption = (order: string, label: string, tagLabel: string | null = null) => ({
  order,
  label,
  tagLabel,
  summary: `${label}, in short.`,
  description: `${label}, described.`,
  promptField: null,
})

export const missingPage = {
  kind: "missing",
  shell,
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

export const chatReply = {
  heading: "Chat with the agent",
  agentState: "not-running",
  agentStateLabel: "Agent not running",
  notice: "Prototype. Answers are samples.",
  emptyMessage: "Ask about this review.",
  placeholder: "Ask about this review",
  sendLabel: "Send",
  closeLabel: "Close the chat",
  askLabel: "Ask the agent",
  messages: [],
}
