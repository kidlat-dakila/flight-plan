import { NO_WRITING_ACTIVITY } from "@/procedures/get-review/utils/build-progress"
import { buildReviewPage, type ReviewPageSource } from "@/procedures/get-review/utils/build-review-page"
import { EMPTY_DISCUSSION } from "@/procedures/get-review/utils/discussion"
import { mockJourney } from "@/procedures/get-review/utils/mocks/mock-journey"
import type { GetReviewInput } from "@/procedures/get-review/utils/schemas"
import { EMPTY_SETUP } from "@/procedures/get-setup/utils/setup"
import type { PullRequestTarget, Repository } from "@/procedures/list-repositories/utils/repository"
import { NO_REVIEWED_MARKS } from "@flightplan/codegraph"
import {
  cartSource,
  createArtifact,
  createSegment,
  createWaypoint,
  fixtureSources,
  CART_PATH,
  PRICE_PATH,
  priceSource,
} from "./review-fixture"

const target: PullRequestTarget = {
  kind: "pull-request",
  number: 412,
  title: "Count held units",
  branch: "feature/held-stock",
  author: "mira",
  authorAvatarUrl: null,
  branchStatus: "draft",
  isNew: false,
  updatedAt: new Date("2026-10-01T12:00:00.000Z"),
}

const repository: Repository = {
  name: "storefront",
  path: "/work/storefront",
  forge: "gh",
  forgeSlug: "acme/storefront",
  problem: null,
  hasFollowedAuthors: true,
  targets: [target],
}

const createSource = (overrides: Partial<ReviewPageSource> = {}): ReviewPageSource => ({
  repository,
  lineColor: "green",
  target,
  isOwn: false,
  branchLinking: null,
  detail: {
    headCommit: "abc1234",
    forgeUrl: "https://github.com/acme/storefront/pull/412",
    reviewers: [{ name: "jonas weber", avatarUrl: null, state: "approved" }],
    changedPaths: ["src/price.ts", "src/cart.ts", "src/Cart.tsx", "README"],
  },
  artifact: createArtifact(),
  marks: NO_REVIEWED_MARKS,
  discussion: EMPTY_DISCUSSION,
  publications: [],
  now: new Date("2026-10-01T12:00:00.000Z"),
  notice: "Sample data.",
  sources: fixtureSources,
  solutionTokens: new Map(),
  setup: EMPTY_SETUP,
  startableAgents: [],
  agentModels: {},
  activity: NO_WRITING_ACTIVITY,
  ...overrides,
})

const createInput = (overrides: Partial<GetReviewInput> = {}): GetReviewInput => ({
  repositoryName: "storefront",
  targetId: "pr-412",
  filterKeys: null,
  isShowingReviewed: false,
  ...overrides,
})

describe("buildReviewPage", () => {
  it("offers the start form with the count of changed files when the review target has no artifact", () => {
    expect(buildReviewPage(createSource({ artifact: null }), createInput())).toMatchObject({
      kind: "missing",
      heading: "No Flight Plan Review yet",
      changedFiles: [
        { text: "4 changed files", kind: "plain" },
        { text: "2 TypeScript", kind: "plain" },
        { text: "1 TSX", kind: "plain" },
        { text: "1 other", kind: "plain" },
      ],
      form: { configuration: { selectedPreset: "standard" }, order: { selectedOrder: "foundations-first" } },
    })
  })

  it("says the changed files are not read yet when the review target has no detail", () => {
    expect(buildReviewPage(createSource({ artifact: null, detail: null }), createInput())).toMatchObject({
      changedFiles: [{ text: "The changed files are not read yet", kind: "plain" }],
    })
  })

  it("puts the pull request, its status, its author, its reviewers and its forge link in the header", () => {
    expect(buildReviewPage(createSource(), createInput()).shell).toStrictEqual({
      documentTitle: "Count held units • storefront",
      lineColor: "green",
      notice: "Sample data.",
      authorLabel: null,
      header: {
        kind: "pull-request",
        title: "Count held units",
        author: { name: "mira", avatarUrl: null, monogram: "M" },
        status: "draft",
        statusLabel: "Draft",
        artifactFreshness: { label: "Updated", isOutOfDate: false },
        reviewers: [
          { name: "jonas weber", avatarUrl: null, monogram: "JW", state: "approved", stateLabel: "jonas weber approved" },
        ],
        reviewersEmptyLabel: null,
        forgeLink: { href: "https://github.com/acme/storefront/pull/412", label: "View pull request" },
      },
    })
  })

  it("says the header's artifact status is out of date when the head has moved past the artifact's commit", () => {
    const moved = createSource({ detail: { headCommit: "fff9999", forgeUrl: null, reviewers: [], changedPaths: [] } })

    expect(buildReviewPage(moved, createInput()).shell.header).toMatchObject({
      artifactFreshness: { label: "Out of date", isOutOfDate: true },
    })
  })

  it("leaves the header's artifact status out when there is no artifact or no detail", () => {
    expect(buildReviewPage(createSource({ artifact: null }), createInput()).shell.header).toMatchObject({
      artifactFreshness: null,
    })
    expect(buildReviewPage(createSource({ detail: null }), createInput()).shell.header).toMatchObject({
      artifactFreshness: null,
    })
  })

  it("shows a branch without a forge by its name, with a way to connect one", () => {
    const branch = { ...target, kind: "branch" as const, name: "held-stock" }
    const page = buildReviewPage(
      createSource({ repository: { ...repository, forge: "git", forgeSlug: null }, target: branch, detail: null }),
      createInput(),
    )

    expect(page.shell.header).toStrictEqual({
      kind: "branch",
      branch: "held-stock",
      forgeMessage: "Local git has no reviews to show",
      artifactFreshness: null,
      action: { href: "/configurations/forge", label: "Connect a code host" },
    })
  })

  it("still carries the artifact's freshness in the header of a branch with no code host", () => {
    const branch = { ...target, kind: "branch" as const, name: "held-stock" }
    const page = buildReviewPage(
      createSource({
        repository: { ...repository, forge: "git", forgeSlug: null },
        target: branch,
        detail: { headCommit: "abc1234", forgeUrl: null, reviewers: [], changedPaths: [] },
      }),
      createInput(),
    )

    expect(page.shell.header).toMatchObject({ artifactFreshness: { label: "Updated", isOutOfDate: false } })
  })

  it("says the artifact is stale when the head has moved past its commit", () => {
    const moved = createSource({ detail: { headCommit: "fff9999", forgeUrl: null, reviewers: [], changedPaths: [] } })

    expect(buildReviewPage(moved, createInput())).toMatchObject({
      staleNotice: {
        message: [
          { kind: "text", text: "This review describes commit " },
          { kind: "code", text: "abc1234" },
          { kind: "text", text: ". The pull request has moved to " },
          { kind: "code", text: "fff9999" },
          { kind: "text", text: " since." },
        ],
        promptLabel: "Copy the update prompt",
      },
    })
    expect(buildReviewPage(createSource(), createInput())).toMatchObject({ staleNotice: null })
  })

  it("says the artifact is still being written while it is drafting", () => {
    const drafting = createSource({ artifact: createArtifact({ status: "drafting" }) })

    expect(buildReviewPage(drafting, createInput())).toMatchObject({ progress: { label: "Still being written" }, completion: null })
    expect(buildReviewPage(createSource(), createInput())).toMatchObject({
      progress: null,
      completion: { title: "Flight Plan Review ready" },
    })
  })

  it("heads a segment the agent has not titled yet with its position alone", () => {
    const artifact = createArtifact({
      isSegmented: true,
      segments: [createSegment({ id: "one", title: "" }), createSegment({ id: "two", title: "Two" })],
    })
    const page = buildReviewPage(createSource({ artifact }), createInput())

    expect(page).toMatchObject({
      segments: [{ title: "Segment 1", heading: "Segment 1" }, { title: "Two", heading: "Segment 2: Two" }],
      rail: { groups: [{ label: "Segment 1 (1/2)" }, { label: "Two (2/2)" }] },
    })
  })

  it("builds every segment on one page, each with its own scoped anchors, and groups the rail by segment", () => {
    const artifact = createArtifact({
      isSegmented: true,
      segments: [
        createSegment({ id: "one", title: "One", context: "First part." }),
        createSegment({ id: "two", title: "Two", blast: { nodes: [{ path: PRICE_PATH, diffType: "modified", impactType: null, impactReason: null }], edges: [] }, walkthrough: { intro: null, files: [] } }),
      ],
    })
    const page = buildReviewPage(createSource({ artifact }), createInput())

    expect(page).toMatchObject({
      segments: [
        {
          id: "one",
          anchorId: "segment-one",
          title: "One",
          heading: "Segment 1: One",
          detailLabel: "2 files",
          context: { anchorId: "one-context", context: [{ kind: "paragraph", inlines: [{ kind: "text", text: "First part." }] }] },
          journey: { anchorId: "one-journey-flow-diagram" },
          blast: null,
          walkthrough: { anchorId: "one-code-walkthrough" },
        },
        { id: "two", anchorId: "segment-two", title: "Two", heading: "Segment 2: Two", blast: { anchorId: "two-blast-diagram" } },
      ],
      rail: {
        groups: [
          { anchorId: "segment-one", label: "One (1/2)", detailLabel: "2 files" },
          { anchorId: "segment-two", label: "Two (2/2)", detailLabel: "2 files" },
        ],
        sections: [{ anchorId: "conversation", kind: "conversation", label: "Conversation" }],
      },
    })
    expect(page.kind === "artifact" ? page.rail.groups.map((group) => group.sections.map((section) => section.kind)) : []).toStrictEqual([
      ["context", "journey", "walkthrough"],
      ["context", "journey", "blast", "walkthrough"],
    ])
  })

  it("lists the walkthrough's files as rail children, one per file", () => {
    const artifact = createArtifact({
      isSegmented: true,
      segments: [
        createSegment({ id: "one" }),
        createSegment({ id: "two", walkthrough: { intro: null, files: [] } }),
      ],
    })
    const page = buildReviewPage(createSource({ artifact }), createInput())

    expect(page.kind === "artifact" ? page.rail.groups.map((group) => group.sections.find((section) => section.kind === "walkthrough")?.children) : []).toStrictEqual([
      [{ anchorId: "one-file-1", label: "Price file" }, { anchorId: "one-file-2", label: "Cart file" }],
      [],
    ])
  })

  it("leaves a change that is not segmented without a segment title, and its anchors without a prefix", () => {
    expect(buildReviewPage(createSource(), createInput())).toMatchObject({
      segments: [{ title: null, heading: null, detailLabel: null, outline: { heading: "Segment 1: Everything", detailLabel: "2 files", label: "Everything", paths: [PRICE_PATH, CART_PATH], canMoveUp: false, canMoveDown: false }, context: { anchorId: "context" }, walkthrough: { anchorId: "code-walkthrough" } }],
      rail: { groups: [{ label: null }] },
      walkthroughControls: { stepping: { idleLabel: "3 waypoints" } },
    })
  })

  it("resolves every code link the segments use, and points it at its waypoint when that is shown", () => {
    const artifact = createArtifact({
      segments: [
        createSegment({
          context: "See [`format()`](code:src/price.ts#format) and [gone](code:src/gone.ts#x).",
        }),
      ],
    })
    const page = buildReviewPage(createSource({ artifact }), createInput())

    expect(page.kind === "artifact" ? Object.keys(page.codeLinks).sort() : []).toStrictEqual([
      "src/cart.ts#subtotal",
      "src/price.ts#format",
      "src/price.ts#priceOf",
    ])
    expect(page).toMatchObject({
      codeLinks: { "src/price.ts#format": { anchorId: "waypoint-format", pathLabel: "src/price.ts" } },
      segments: [
        {
          context: {
            context: [
              {
                inlines: [
                  { kind: "text" },
                  { kind: "code-link", linkId: "src/price.ts#format" },
                  { kind: "text" },
                  { kind: "code-link", text: "gone", linkId: null },
                  { kind: "text" },
                ],
              },
            ],
          },
        },
      ],
    })
  })

  it("draws each Journey Flow Diagram with its configuration, and states why a change has none", () => {
    const flow = mockJourney(
      [priceSource, cartSource],
      [
        { id: "route", type: "function", path: PRICE_PATH, declaration: "format", isChanged: false, label: null, description: null },
        {
          id: "price",
          type: "component",
          path: PRICE_PATH,
          declaration: "priceOf",
          isChanged: true,
          label: "Shows a price",
          description: null,
          triggers: [{ codeBlockId: "price-click", type: "render-event", name: "onClick", label: null }],
          children: [{ id: "badge", type: "component", path: PRICE_PATH, declaration: "format", isChanged: false, label: "Shows a badge", description: null }],
        },
      ],
      [["route", "price"], ["price", "badge"]],
    )
    const drawn = buildReviewPage(
      createSource({ artifact: createArtifact({ segments: [createSegment({ journey: flow })] }) }),
      createInput(),
    )
    const absent = buildReviewPage(
      createSource({ artifact: createArtifact({ segments: [createSegment({ journey: null })] }) }),
      createInput(),
    )

    expect(drawn).toMatchObject({ segments: [{
      journey: {
        diagram: {
          anchorId: "journey-all",
          title: "priceOf",
          description: null,
          descriptionMarkdown: "",
          unwrittenLabel: "Not written yet.",
          nodes: [
            { id: "route", type: "function", typeLabel: "Function", change: null, label: "format", isDraft: true, name: "format", shortPath: PRICE_PATH, codeLinkId: "src/price.ts#format", children: [] },
            {
              id: "price",
              type: "component",
              typeLabel: "Component",
              change: "modified",
              changedLabel: "Modified",
              label: "Shows a price",
              isDraft: false,
              name: "priceOf",
              shortPath: PRICE_PATH,
              codeViews: [{ heading: "Code", pathLabel: PRICE_PATH }],
              triggerLabels: [{ id: "price-click", type: "render-event", typeLabel: "Event", name: "onClick", label: "onClick", isDraft: true, lines: [[11, 12]] }],
              children: [{ id: "badge", type: "component", label: "Shows a badge", children: [] }],
            },
          ],
          edges: [
            { id: "route -> price", from: "route", to: "price" },
            { id: "price -> badge", from: "price", to: "badge" },
          ],
        },
      },
    }] })
    expect(absent).toMatchObject({ segments: [{ journey: { diagram: null } }] })
  })

  it("draws the Blast Diagram from the files, the imports and the impacts of the segment, and leaves it out when the segment has none", () => {
    const blast = {
      nodes: [
        { path: "src/cart.ts", diffType: null, impactType: "breaks" as const, impactReason: "It assumes a price is never negative." },
        { path: PRICE_PATH, diffType: "modified" as const, impactType: null, impactReason: null },
        { path: "src/report.ts", diffType: null, impactType: null, impactReason: null },
      ],
      edges: [
        { importer: "src/cart.ts", imported: PRICE_PATH },
        { importer: "src/report.ts", imported: PRICE_PATH },
      ],
    }
    const page = buildReviewPage(
      createSource({ artifact: createArtifact({ segments: [createSegment({ blast })] }) }),
      createInput(),
    )

    expect(page).toMatchObject({ segments: [{
      blast: {
        heading: "Blast Diagram",
        defaultViewId: "export-bound",
        views: [{
          id: "export-bound",
          summary: ["3 files", "1 changed", "2 imports", "1 breaks", "1 not assessed"],
          legend: [{ mark: "modified" }, { mark: "breaks" }, { mark: "plain" }],
          board: {
            nodes: [
              { id: "src/cart.ts", mark: "breaks", markLabel: "Breaks", label: "cart.ts", impactReason: [{ kind: "paragraph" }] },
              { id: PRICE_PATH, mark: "modified", markLabel: "Modified", importers: { heading: "Imported by 2 files" } },
              { id: "src/report.ts", mark: "plain", markLabel: "Not assessed", impactNote: "Nobody has assessed what the change does to this file." },
            ],
            edges: [{ importerId: "src/cart.ts", importedId: PRICE_PATH }, { importerId: "src/report.ts", importedId: PRICE_PATH }],
          },
        }],
      },
    }] })
    expect(buildReviewPage(createSource(), createInput())).toMatchObject({ segments: [{ blast: null }] })
  })

  it("applies the waypoint filter it is asked for", () => {
    const artifact = createArtifact({
      segments: [
        createSegment({
          walkthrough: {
            intro: "Read the price first.",
            files: [
              { path: PRICE_PATH, title: "Price file", summary: [], waypoints: [createWaypoint("w", "priceOf", { needsAttention: "Slow." })] },
            ],
          },
        }),
      ],
    })
    const page = buildReviewPage(createSource({ artifact }), createInput({ filterKeys: ["bug"] }))

    expect(page).toMatchObject({ segments: [{ walkthrough: { files: [], emptyMessage: "No waypoint matches the filter." } }] })
  })

  it("shows the pull request's conversation, the review controls and the ways to publish", () => {
    const discussion = {
      threads: [
        {
          id: "thread-1",
          path: null,
          line: null,
          comments: [{ id: "comment-1", author: "teo", body: "Later.", createdAt: new Date("2026-10-01T11:00:00.000Z"), isPending: false }],
        },
        {
          id: "thread-2",
          path: PRICE_PATH,
          line: 11,
          comments: [{ id: "comment-2", author: "you", body: "Mine.", createdAt: new Date("2026-10-01T11:30:00.000Z"), isPending: true }],
        },
      ],
      reviews: [
        { id: "review-1", author: "jonas", verdict: "approve" as const, body: "Good.", createdAt: new Date("2026-10-01T10:00:00.000Z") },
      ],
    }
    const publications = [{ kind: "claude" as const, url: "https://claude.ai/artifact/x", publishedAt: new Date("2026-10-01T11:58:00.000Z") }]
    const page = buildReviewPage(createSource({ discussion, publications }), createInput())

    expect(page).toMatchObject({
      conversation: {
        threadId: "thread-1",
        emptyMessage: null,
        entries: [
          { id: "review-1", verdict: "approve", verdictLabel: "Approved", timeLabel: "2 hours ago" },
          { id: "comment-1", verdict: null, author: { name: "teo" } },
        ],
      },
      reviewDraft: {
        isAvailable: true,
        buttonLabel: "Submit review (1)",
        pendingLabel: "1 pending comment will be sent with it.",
      },
      sharing: {
        options: [
          { key: "description", isAvailable: true, statusLabel: null, link: null },
          { key: "claude", statusLabel: "Published 2 minutes ago", link: { href: "https://claude.ai/artifact/x" } },
        ],
      },
    })
  })

  it("invites a first comment on a pull request nobody has commented on", () => {
    expect(buildReviewPage(createSource(), createInput())).toMatchObject({
      conversation: { emptyMessage: "Nobody has commented on this pull request yet.", threadId: null, entries: [] },
      composer: { addLabel: "Add a comment on this line" },
    })
  })

  it("shows the review and the description upload as unavailable for a branch without a code host", () => {
    const page = buildReviewPage(createSource({ detail: { headCommit: "abc1234", forgeUrl: null, reviewers: [], changedPaths: [] } }), createInput())

    expect(page).toMatchObject({
      conversation: null,
      composer: null,
      rail: { sections: [] },
      reviewDraft: { isAvailable: false, unavailableReason: "A branch without a code host has no review to submit." },
      sharing: { options: [{ key: "description", isAvailable: false }, { key: "claude", isAvailable: true }] },
    })
  })

  it("keeps the viewer's own Flight Plan to its author until it is uploaded", () => {
    const page = buildReviewPage(createSource({ isOwn: true }), createInput())

    expect(page).toMatchObject({
      isOwn: true,
      shell: { authorLabel: "Your Flight Plan" },
      completeAction: null,
      conversation: null,
      composer: null,
      reviewDraft: null,
      sharing: { buttonLabel: "Share" },
    })
  })

  it("opens the viewer's own Flight Plan to comments and the review once it is uploaded", () => {
    const publications = [{ kind: "claude", url: "https://claude.ai/artifact/sample", publishedAt: new Date("2026-10-01T11:00:00.000Z") }] as const
    const page = buildReviewPage(createSource({ isOwn: true, publications }), createInput())

    expect(page).toMatchObject({
      isOwn: true,
      shell: { authorLabel: null },
      conversation: { entries: [] },
      composer: { submitLabel: "Add to review" },
      reviewDraft: { isAvailable: true },
    })
  })

  it("offers to mark the viewer's own Flight Plan as complete, and to share it only after that", () => {
    const authoring = createSource({ isOwn: true, artifact: createArtifact({ status: "authoring" }) })

    expect(buildReviewPage(authoring, createInput())).toMatchObject({
      completeAction: { label: "Mark as complete", pullRequestChoice: null },
      sharing: null,
      progress: null,
    })
    expect(buildReviewPage({ ...authoring, isOwn: false }, createInput())).toMatchObject({
      completeAction: null,
      sharing: { buttonLabel: "Share" },
    })
  })

  it("asks which pull request a branch's Flight Plan belongs to when it is marked as complete", () => {
    const branch = { kind: "branch", name: "feature/held-stock", branchStatus: "no-review", isNew: false, updatedAt: target.updatedAt } as const
    const authoring = createSource({ isOwn: true, artifact: createArtifact({ status: "authoring" }) })

    expect(buildReviewPage({ ...authoring, branchLinking: { branch, pullRequests: [target] } }, createInput())).toMatchObject({
      completeAction: {
        pullRequestChoice: {
          title: "Choose the pull request",
          emptyMessage: null,
          options: [{ id: "pr-412", label: "Count held units", detail: "#412 • feature/held-stock" }],
          selectedId: "pr-412",
          skipLabel: "Complete without a pull request",
        },
      },
    })
    expect(buildReviewPage({ ...authoring, branchLinking: { branch, pullRequests: [] } }, createInput())).toMatchObject({
      completeAction: {
        pullRequestChoice: { emptyMessage: "You have no open pull request without a Flight Plan.", options: [], selectedId: null },
      },
    })
  })

  it("shows every reviewed part on the viewer's own Flight Plan", () => {
    const own = buildReviewPage(createSource({ isOwn: true }), createInput({ isShowingReviewed: false }))
    const reviewers = buildReviewPage(createSource(), createInput({ isShowingReviewed: false }))

    expect(own.kind === "artifact" ? own.walkthroughControls : null).toMatchObject({ reviewedToggle: { isShown: true } })
    expect(reviewers.kind === "artifact" ? reviewers.walkthroughControls : null).toMatchObject({ reviewedToggle: { isShown: false } })
  })
})
