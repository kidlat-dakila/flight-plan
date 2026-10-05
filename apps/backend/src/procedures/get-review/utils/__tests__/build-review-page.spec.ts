import { buildReviewPage, type ReviewPageSource } from "@/procedures/get-review/utils/build-review-page"
import { EMPTY_DISCUSSION } from "@/procedures/get-review/utils/discussion"
import { NO_REVIEWED_MARKS } from "@/procedures/get-review/utils/review-store"
import type { GetReviewInput } from "@/procedures/get-review/utils/schemas"
import { EMPTY_SETUP } from "@/procedures/get-setup/utils/setup"
import type { PullRequestTarget, Repository } from "@/procedures/list-repositories/utils/repository"
import {
  createArtifact,
  createDeclarationNode,
  createSegment,
  createWaypoint,
  fixtureSources,
  PRICE_PATH,
} from "./review-fixture"

const NO_DIAGRAM_REQUEST = { levels: null, isShowingData: null, isShowingAssumed: null }

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
  ...overrides,
})

const createInput = (overrides: Partial<GetReviewInput> = {}): GetReviewInput => ({
  repositoryName: "storefront",
  targetId: "pr-412",
  filterKeys: null,
  isShowingReviewed: false,
  journey: NO_DIAGRAM_REQUEST,
  blast: NO_DIAGRAM_REQUEST,
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

    expect(buildReviewPage(drafting, createInput())).toMatchObject({ draftingNotice: { label: "Still being written" } })
    expect(buildReviewPage(createSource(), createInput())).toMatchObject({ draftingNotice: null })
  })

  it("builds every segment on one page, each with its own scoped anchors, and groups the rail by segment", () => {
    const artifact = createArtifact({
      isSegmented: true,
      segments: [
        createSegment({ id: "one", title: "One", context: { context: "First part.", overview: [], implementation: [] } }),
        createSegment({ id: "two", title: "Two", blastAbsence: "Nothing depends on it.", walkthrough: { intro: null, files: [] } }),
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
      segments: [{ title: null, heading: null, detailLabel: null, context: { anchorId: "context" }, walkthrough: { anchorId: "code-walkthrough" } }],
      rail: { groups: [{ label: null }] },
      walkthroughControls: { stepping: { idleLabel: "3 waypoints" } },
    })
  })

  it("resolves every code link the segments use, and points it at its waypoint when that is shown", () => {
    const artifact = createArtifact({
      segments: [
        createSegment({
          context: {
            context: "See [`format()`](code:src/price.ts#format) and [gone](code:src/gone.ts#x).",
            overview: [],
            implementation: [],
          },
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
    const flow = {
      id: "flow",
      title: "A checkout",
      nodes: [
        { kind: "entry-point" as const, id: "click", label: "Click", description: null },
        createDeclarationNode("route", { label: null, declaration: "format" }),
        createDeclarationNode("price", { isChanged: true, category: "guard" }),
      ],
      edges: [
        { from: "click", to: "route", kind: "trigger" as const, certainty: "proven" as const },
        { from: "route", to: "price", kind: "value" as const, certainty: "assumed" as const },
      ],
    }
    const drawn = buildReviewPage(
      createSource({ artifact: createArtifact({ segments: [createSegment({ journey: flow })] }) }),
      createInput(),
    )
    const absent = buildReviewPage(
      createSource({ artifact: createArtifact({ segments: [createSegment({ journeyAbsence: "Nothing starts it." })] }) }),
      createInput(),
    )

    expect(drawn).toMatchObject({ segments: [{
      journey: {
        absence: null,
        configuration: {
          levels: {
            label: "Tail Node levels",
            options: [
              { label: "All", value: null, isSelected: true },
              { label: "None", value: 0, isSelected: false },
            ],
          },
          toggles: [{ key: "assumed", countLabel: "1 connection", isOn: true }],
        },
        diagram: {
          anchorId: "journey-flow",
          title: "A checkout",
          summaryLabel: "3 nodes",
          nodes: [
            { kind: "entry-point", kindLabel: "Entry point", label: "Click" },
            { kind: "tail", label: "format", isDraft: true, codeLinkId: "src/price.ts#format" },
            { kind: "head", category: "guard", kindLabel: "Guard", changedLabel: "Changed" },
          ],
          edges: [
            { kind: "trigger", label: null },
            { kind: "value", isAssumed: true, label: { text: "value, assumed" } },
          ],
        },
      },
    }] })
    expect(absent).toMatchObject({ segments: [{ journey: { diagram: null, configuration: null, absence: [{ kind: "paragraph" }] } }] })
  })

  it("applies the requested diagram configuration", () => {
    const flow = {
      id: "flow",
      title: "A checkout",
      nodes: [createDeclarationNode("route"), createDeclarationNode("price", { isChanged: true })],
      edges: [{ from: "route", to: "price", kind: "value" as const, certainty: "assumed" as const }],
    }
    const page = buildReviewPage(
      createSource({ artifact: createArtifact({ segments: [createSegment({ journey: flow })] }) }),
      createInput({ journey: { levels: null, isShowingData: null, isShowingAssumed: false } }),
    )

    expect(page).toMatchObject({ segments: [{ journey: { diagram: { summaryLabel: "1 of 2 nodes", edges: [] } } }] })
  })

  it("draws the Blast Diagram with verdicts, shields and a summary, and leaves it out when nobody asked", () => {
    const blastNode = (id: string, ring: number, verdict: "unaffected" | "breaks" | null) => ({
      id,
      ring,
      path: PRICE_PATH,
      declaration: id,
      label: null,
      contract: ring === 0 ? { before: null, now: "Takes `held`." } : null,
      verdict,
      effect: null,
    })
    const blast = {
      nodes: [blastNode("priceOf", 0, null), blastNode("report", 1, "unaffected"), blastNode("table", 2, null)],
      edges: [
        { from: "report", to: "priceOf", kind: "call" as const, certainty: "proven" as const },
        { from: "table", to: "report", kind: "call" as const, certainty: "proven" as const },
      ],
    }
    const page = buildReviewPage(
      createSource({ artifact: createArtifact({ segments: [createSegment({ blast })] }) }),
      createInput(),
    )

    expect(page).toMatchObject({ segments: [{
      blast: {
        summaryLabel: "3 nodes",
        summary: [
          { verdict: "changed", label: "1 changed" },
          { verdict: "unaffected", label: "1 unaffected" },
          { verdict: "unassessed", label: "1 not assessed" },
        ],
        board: {
          zones: [{ label: "Epicenter" }, { label: "Direct impact" }, { label: "Indirect impact, ring 2" }],
          nodes: [
            { verdict: "changed", codeLinkId: "src/price.ts#priceOf", contract: { before: null, absentLabel: "Did not exist before this change." } },
            { verdict: "unaffected", shieldLabel: null },
            { verdict: "unassessed", verdictLabel: "Not assessed", shieldLabel: "Shielded by report" },
          ],
        },
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
})
