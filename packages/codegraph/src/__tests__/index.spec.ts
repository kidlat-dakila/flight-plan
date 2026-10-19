import { BASE_COMMIT, createFakeGitAdapter, HEAD_COMMIT, type FakeChange } from "@/import-graph/__tests__/fake-git-adapter"
import { buildBranchCodegraph, buildBranchReviewArtifact, buildCodegraph, storeCodeWalkthrough, storeTraceDiagram, type BranchReviewArtifact, type Codegraph } from "@/index"
import { STOREFRONT_CHANGE } from "./change-fixture"

const codegraphOf = async (change: FakeChange): Promise<Codegraph> =>
  await buildCodegraph({ gitAdapter: createFakeGitAdapter(change), baseCommit: BASE_COMMIT, headCommit: HEAD_COMMIT })

const storedOf = ({ segments }: Codegraph): unknown[] =>
  segments.map((segment) => ({
    ...segment,
    traceDiagram: segment.traceDiagram === null ? null : storeTraceDiagram(segment.traceDiagram),
    codeWalkthrough: storeCodeWalkthrough(segment.codeWalkthrough),
  }))

describe("buildBranchCodegraph", () => {
  it("builds the codegraph of a branch between the commit it started from and its head", async () => {
    const gitAdapter = createFakeGitAdapter(STOREFRONT_CHANGE)
    const baseSha = vi.spyOn(gitAdapter, "baseSha")
    const headSha = vi.spyOn(gitAdapter, "headSha")
    const compare = vi.spyOn(gitAdapter, "compare")
    const ref = { kind: "branch", name: "sale-prices" } as const

    const codegraph = await buildBranchCodegraph({ gitAdapter, ref })

    expect(baseSha.mock.calls).toStrictEqual([[ref]])
    expect(headSha.mock.calls).toStrictEqual([[ref]])
    expect(compare.mock.calls).toStrictEqual([[BASE_COMMIT, HEAD_COMMIT]])
    expect(storedOf(codegraph)).toStrictEqual(storedOf(await codegraphOf(STOREFRONT_CHANGE)))
  })

  it("refuses a branch the repository does not hold", async () => {
    const gitAdapter = createFakeGitAdapter(STOREFRONT_CHANGE)
    vi.spyOn(gitAdapter, "headSha").mockRejectedValue(new Error("sale-prices is not in this checkout."))

    await expect(buildBranchCodegraph({ gitAdapter, ref: { kind: "branch", name: "sale-prices" } })).rejects.toThrow("sale-prices is not in this checkout.")
  })
})

const SEGMENT_UUIDS = ["3f9a1c2e-7b4d-4e1a-9c55-0d2f6a8b1e37", "aa11bb22-7b4d-4e1a-9c55-0d2f6a8b1e37", "cc33dd44-7b4d-4e1a-9c55-0d2f6a8b1e37"]

interface ReviewChoices {
  readonly ignoredPaths?: readonly string[]
  readonly isSegmented?: boolean
}

const reviewArtifactOf = async (change: FakeChange, { ignoredPaths = [], isSegmented = true }: ReviewChoices = {}): Promise<BranchReviewArtifact> => {
  const uuids = SEGMENT_UUIDS[Symbol.iterator]()
  return await buildBranchReviewArtifact({
    gitAdapter: createFakeGitAdapter(change),
    ref: { kind: "branch", name: "sale-prices" },
    title: "Sale prices",
    newId: () => String(uuids.next().value),
    ignoredPaths,
    isSegmented,
  })
}

describe("buildBranchReviewArtifact", () => {
  it("builds a drafting review artifact of the branch, with one unwritten segment per segment of the codegraph", async () => {
    const { artifact, baseCommit } = await reviewArtifactOf(STOREFRONT_CHANGE)
    const { segments } = await codegraphOf(STOREFRONT_CHANGE)

    expect(baseCommit).toBe(BASE_COMMIT)
    expect(artifact).toMatchObject({ title: "Sale prices", status: "drafting", commit: HEAD_COMMIT, isSegmented: true })
    expect(artifact.changedPaths).toStrictEqual(["README.md", "src/logger.ts", "src/pricing.ts", "src/types.ts"])
    expect(artifact.segments.map((segment) => [segment.id, segment.title, segment.context, segment.changedPaths])).toStrictEqual([
      ["3f9a1c2e", "", "", ["src/pricing.ts", "src/types.ts"]],
      ["aa11bb22", "", "", ["src/logger.ts"]],
      ["cc33dd44", "", "", ["README.md"]],
    ])
    expect(artifact.segments.map((segment) => [segment.traceDiagram === null, segment.blastDiagram === null])).toStrictEqual(
      segments.map((segment) => [segment.traceDiagram === null, segment.blastDiagram === null]),
    )
    expect(artifact.segments.map((segment) => segment.walkthrough.files.map((file) => file.path))).toStrictEqual(
      segments.map((segment) => segment.codeWalkthrough.files.map((file) => file.path)),
    )
  })

  it("keeps the lines of every changed file and of every file a trace shows, with the diff marked on them", async () => {
    const { artifact } = await reviewArtifactOf(STOREFRONT_CHANGE)
    const sourceOf = (path: string): (typeof artifact.sources)[number] | undefined => artifact.sources.find((source) => source.path === path)

    expect(artifact.sources.map((source) => source.path)).toStrictEqual(expect.arrayContaining(["README.md", "src/pricing.ts", "src/cart.ts", "src/ui.ts"]))
    expect(sourceOf("src/pricing.ts")?.lines.filter((line) => line.mark !== "context")).toStrictEqual([
      { text: "  return item.price", mark: "removed", number: null },
      { text: "  return item.onSale ? item.price * 0.9 : item.price", mark: "added", number: 4 },
    ])
    expect(sourceOf("src/cart.ts")?.lines.every((line) => line.mark === "context")).toBe(true)
  })

  it("gives a waypoint a declaration its source file places on lines", async () => {
    const { artifact } = await reviewArtifactOf(STOREFRONT_CHANGE)
    const waypoints = artifact.segments.flatMap((segment) => segment.walkthrough.files.flatMap((file) => file.waypoints.map((waypoint) => [file.path, waypoint] as const)))

    expect(waypoints.length).toBeGreaterThan(0)
    expect(waypoints.every(([path, waypoint]) => {
      const declarations = new Map(Object.entries(artifact.sources.find((source) => source.path === path)?.declarations ?? {}))
      return declarations.has(waypoint.declaration) && !("range" in waypoint)
    })).toBe(true)
  })

  it("leaves the files the ignored paths match out of every segment, diagram and walkthrough", async () => {
    const { artifact } = await reviewArtifactOf(STOREFRONT_CHANGE, { ignoredPaths: ["*.md", "src/logger.ts"] })
    const shownPaths = artifact.segments.flatMap((segment) => [
      ...segment.changedPaths,
      ...segment.walkthrough.files.map((file) => file.path),
      ...(segment.blastDiagram?.nodes.map((node) => node.path) ?? []),
    ])

    expect(artifact.changedPaths).toStrictEqual(["src/pricing.ts", "src/types.ts"])
    expect(artifact.segments.map((segment) => segment.changedPaths)).toStrictEqual([["src/pricing.ts", "src/types.ts"]])
    expect(shownPaths).not.toContain("README.md")
    expect(shownPaths).not.toContain("src/logger.ts")
  })

  it("keeps every segment when segments are off, and says so for the page to show them as one", async () => {
    const { artifact } = await reviewArtifactOf(STOREFRONT_CHANGE, { isSegmented: false })

    expect(artifact.isSegmented).toBe(false)
    expect(artifact.segments.map((segment) => segment.changedPaths)).toStrictEqual([["src/pricing.ts", "src/types.ts"], ["src/logger.ts"], ["README.md"]])
  })

  it("names a deleted file among the changed files, and asks the head commit for none of its lines", async () => {
    const { "src/logger.ts": deleted, ...head } = STOREFRONT_CHANGE.base
    const gitAdapter = createFakeGitAdapter({ base: STOREFRONT_CHANGE.base, head })
    const blobs = vi.spyOn(gitAdapter, "blobs")

    const { artifact } = await buildBranchReviewArtifact({ gitAdapter, ref: { kind: "branch", name: "no-logger" }, title: "No logger", newId: () => SEGMENT_UUIDS[0], ignoredPaths: [], isSegmented: true })

    expect(deleted).toBeDefined()
    expect(artifact.changedPaths).toStrictEqual(["src/logger.ts"])
    expect(artifact.segments.map((segment) => segment.changedPaths)).toStrictEqual([["src/logger.ts"]])
    expect(blobs.mock.calls.filter(([, commit]) => commit === HEAD_COMMIT).flatMap(([paths]) => paths)).not.toContain("src/logger.ts")
  })
})

describe("buildCodegraph", () => {
  it("makes one segment per line of change, with the files of its group the diff did not touch, and one for a file no language reads", async () => {
    const { segments } = await codegraphOf(STOREFRONT_CHANGE)

    expect(segments.map((segment) => [segment.kind, segment.importGraph.map((file) => file.filePath)])).toStrictEqual([
      ["entry", ["src/cart.ts", "src/pricing.ts", "src/types.ts", "src/ui.ts"]],
      ["entry", ["src/logger.ts"]],
      ["entry", ["README.md"]],
    ])
  })

  it("draws the trace of each segment from the top of its chains down to its change, and none for a file no language reads", async () => {
    const { segments } = await codegraphOf(STOREFRONT_CHANGE)

    expect(segments.map((segment) => segment.traceDiagram === null)).toStrictEqual([false, false, true])
    expect(segments[0].traceDiagram?.traceNodes.map((node) => [node.id, node.type])).toStrictEqual([
      ["src/ui.ts#function@3:1", "function"],
      ["src/cart.ts#class@3:1", "class"],
      ["src/pricing.ts#function@3:1", "function"],
    ])
    expect(segments[0].traceDiagram?.traceNodes[1].children.map((node) => [node.id, node.type])).toStrictEqual([["src/cart.ts#method@4:3", "method"]])
    expect(segments[0].traceDiagram?.traceNodeEdges.map((edge) => [edge.from, edge.to])).toStrictEqual([
      ["src/ui.ts#function@3:1", "src/cart.ts#class@3:1"],
      ["src/cart.ts#method@4:3", "src/pricing.ts#function@3:1"],
      ["src/cart.ts#class@3:1", "src/cart.ts#method@4:3"],
    ])
  })

  it("draws the blast of a segment from the blocks that use its change: its changed files, the files that use them, and each use once", async () => {
    const { segments } = await codegraphOf(STOREFRONT_CHANGE)

    expect(segments[0].blastDiagram).toStrictEqual({
      nodes: [
        { path: "src/pricing.ts", diffType: "modified", impactType: null, impactReason: null, isRequired: false },
        { path: "src/types.ts", diffType: "modified", impactType: null, impactReason: null, isRequired: false },
        { path: "src/cart.ts", diffType: null, impactType: null, impactReason: null, isRequired: false },
        { path: "src/ui.ts", diffType: null, impactType: null, impactReason: null, isRequired: false },
      ],
      edges: [
        { importer: "src/cart.ts", imported: "src/pricing.ts" },
        { importer: "src/pricing.ts", imported: "src/types.ts" },
        { importer: "src/ui.ts", imported: "src/cart.ts" },
      ],
      importBound: {
        nodes: [
          { path: "src/pricing.ts", diffType: "modified" },
          { path: "src/types.ts", diffType: "modified" },
        ],
        edges: [{ importer: "src/pricing.ts", imported: "src/types.ts" }],
      },
    })
  })

  it("draws the import bound of a segment from the root blocks around its change: the files they use, the files those use, each file and each use once", async () => {
    const tax = "export const taxOf = (price) => price * 0.2"
    const pricing = ["import { taxOf } from \"./tax\"", "", "export const unused = 1", "", "export const priceOf = (item) => item.price + taxOf(item.price)"].join("\n")
    const cart = (separator: string): string =>
      ["import { priceOf } from \"./pricing\"", "", "export function subtotal(items) {", `  const prices = items.map(priceOf)`, `  return prices.concat(prices.map(priceOf)).join("${separator}")`, "}"].join("\n")
    const page = "import { subtotal } from \"./cart\"\n\nexport const render = (items) => subtotal(items)"
    const files = { "src/tax.ts": tax, "src/pricing.ts": pricing, "src/page.ts": page }
    const { segments } = await codegraphOf({
      base: { ...files, "src/cart.ts": cart(",") },
      head: { ...files, "src/cart.ts": cart(";") },
    })

    expect(segments[0].blastDiagram?.importBound).toStrictEqual({
      nodes: [
        { path: "src/cart.ts", diffType: "modified" },
        { path: "src/pricing.ts", diffType: null },
        { path: "src/tax.ts", diffType: null },
      ],
      edges: [
        { importer: "src/cart.ts", imported: "src/pricing.ts" },
        { importer: "src/pricing.ts", imported: "src/tax.ts" },
      ],
    })
    expect(segments[0].blastDiagram?.nodes.map((node) => node.path)).toStrictEqual(["src/cart.ts", "src/page.ts"])
  })

  it("gives an entry segment no blast when nothing outside the change uses it, in a change of several segments", async () => {
    const { segments } = await codegraphOf(STOREFRONT_CHANGE)

    expect(segments.map((segment) => segment.blastDiagram === null)).toStrictEqual([false, true, true])
  })

  it("numbers the waypoints through every segment and links each to the diagrams of its own", async () => {
    const { segments } = await codegraphOf(STOREFRONT_CHANGE)
    const waypoints = segments.flatMap((segment) => segment.codeWalkthrough.files).flatMap((file) => file.waypoints.map((waypoint) => ({ path: file.path, ...waypoint })))

    expect(waypoints.map(({ id, path, declaration, category, traceNodeId }) => ({ id, path, declaration, category, traceNodeId }))).toStrictEqual([
      {
        id: "w1",
        path: "src/pricing.ts",
        declaration: "priceOf",
        category: "function",
        traceNodeId: "src/pricing.ts#function@3:1",
      },
      {
        id: "w2",
        path: "src/types.ts",
        declaration: "Item",
        category: "type",
        traceNodeId: null,
      },
      {
        id: "w3",
        path: "src/logger.ts",
        declaration: "log",
        category: "function",
        traceNodeId: "src/logger.ts#function@1:1",
      },
      {
        id: "w4",
        path: "README.md",
        declaration: "Lines 1–3",
        category: "file",
        traceNodeId: null,
      },
    ])
  })

  it("gives the only segment of a change a blast, and no trace and no waypoint when its only change is an import", async () => {
    const pricing = "export const priceOf = (item) => item.price"
    const cart = (imported: string): string => [`import { ${imported} } from "./pricing"`, "", "export const subtotal = (items) => items.map(priceOf)"].join("\n")
    const { segments } = await codegraphOf({
      base: { "src/pricing.ts": pricing, "src/cart.ts": cart("priceOf") },
      head: { "src/pricing.ts": pricing, "src/cart.ts": cart("priceOf, taxOf") },
    })

    expect(segments).toHaveLength(1)
    expect(segments[0].traceDiagram).toBeNull()
    expect(segments[0].blastDiagram).toStrictEqual({
      nodes: [{ path: "src/cart.ts", diffType: "modified", impactType: null, impactReason: null, isRequired: false }],
      edges: [],
      importBound: { nodes: [{ path: "src/cart.ts", diffType: "modified" }], edges: [] },
    })
    expect(segments[0].codeWalkthrough.files).toStrictEqual([])
  })

  it("splits a change into the shared segment, with a trace of the shared files alone, and one entry segment per line of change, each with the trace of its own line", async () => {
    const page = (name: string, mark: string): string => [`import { format } from "./format"`, `export const ${name} = () => format("${mark}")`].join("\n")
    const main = ["import { pageA } from \"./pageA\"", "import { pageB } from \"./pageB\"", "pageA()", "pageB()"].join("\n")
    const { segments } = await codegraphOf({
      base: { "src/main.ts": main, "src/pageA.ts": page("pageA", "a"), "src/pageB.ts": page("pageB", "b"), "src/format.ts": "export const format = (text) => text" },
      head: { "src/main.ts": main, "src/pageA.ts": page("pageA", "A"), "src/pageB.ts": page("pageB", "B"), "src/format.ts": "export const format = (text) => text.trim()" },
    })

    expect(segments.map((segment) => [segment.kind, segment.importGraph.filter((file) => file.diffType !== null).map((file) => file.filePath)])).toStrictEqual([
      ["shared", ["src/format.ts"]],
      ["entry", ["src/pageA.ts"]],
      ["entry", ["src/pageB.ts"]],
    ])
    expect(segments.map((segment) => segment.traceDiagram?.traceNodes.map((node) => node.codeBlocks[0].name ?? node.type) ?? null)).toStrictEqual([
      ["format"],
      ["pageA", "format"],
      ["pageB", "format"],
    ])
    expect(segments.map((segment) => segment.blastDiagram?.nodes.map((node) => node.path) ?? null)).toStrictEqual([
      ["src/format.ts", "src/main.ts", "src/pageA.ts", "src/pageB.ts"],
      ["src/pageA.ts", "src/main.ts"],
      ["src/pageB.ts", "src/main.ts"],
    ])
    expect(segments.map((segment) => segment.codeWalkthrough.files.map((file) => file.path))).toStrictEqual([["src/format.ts"], ["src/pageA.ts"], ["src/pageB.ts"]])
  })

  it("puts a changed file no language reads in the shared segment, after its files, when the change has one", async () => {
    const page = (name: string, mark: string): string => [`import { format } from "./format"`, `export const ${name} = () => format("${mark}")`].join("\n")
    const { segments } = await codegraphOf({
      base: { "README.md": "# Shop", "src/pageA.ts": page("pageA", "a"), "src/pageB.ts": page("pageB", "b"), "src/format.ts": "export const format = (text) => text" },
      head: { "README.md": "# Store", "src/pageA.ts": page("pageA", "A"), "src/pageB.ts": page("pageB", "B"), "src/format.ts": "export const format = (text) => text.trim()" },
    })

    expect(segments.map((segment) => [segment.kind, segment.codeWalkthrough.files.map((file) => file.path)])).toStrictEqual([
      ["shared", ["src/format.ts", "README.md"]],
      ["entry", ["src/pageA.ts"]],
      ["entry", ["src/pageB.ts"]],
    ])
    expect(segments[0].importGraph.map((file) => file.filePath)).toContain("README.md")
    expect(segments.flatMap((segment) => segment.codeWalkthrough.files.flatMap((file) => file.waypoints.map((waypoint) => waypoint.id)))).toStrictEqual(["w1", "w2", "w3", "w4"])
  })

  it("draws a shared file above the lines of change in every trace, and leaves it and what uses a change only through it out of the Blast Diagram of an entry segment", async () => {
    const page = (name: string, mark: string): string => `export const ${name} = () => "${mark}"`
    const routes = (mark: string): string => ["import { pageA } from \"./pageA\"", "import { pageB } from \"./pageB\"", `export const routes = () => [pageA(), pageB(), "${mark}"]`].join("\n")
    const main = ["import { routes } from \"./routes\"", "routes()"].join("\n")
    const { segments } = await codegraphOf({
      base: { "src/main.ts": main, "src/admin.ts": main, "src/routes.ts": routes("a"), "src/pageA.ts": page("pageA", "a"), "src/pageB.ts": page("pageB", "b") },
      head: { "src/main.ts": main, "src/admin.ts": main, "src/routes.ts": routes("A"), "src/pageA.ts": page("pageA", "A"), "src/pageB.ts": page("pageB", "B") },
    })

    expect(segments.map((segment) => [segment.kind, segment.codeWalkthrough.files.map((file) => file.path)])).toStrictEqual([
      ["shared", ["src/routes.ts"]],
      ["entry", ["src/pageA.ts"]],
      ["entry", ["src/pageB.ts"]],
    ])
    expect(segments.map((segment) => segment.blastDiagram?.nodes.map((node) => node.path) ?? null)).toStrictEqual([["src/routes.ts", "src/admin.ts", "src/main.ts"], null, null])
    expect(segments.map((segment) => segment.traceDiagram?.traceNodes.map((node) => node.codeBlocks[0].name ?? node.type) ?? null)).toStrictEqual([
      ["routes"],
      ["routes", "pageA"],
      ["routes", "pageB"],
    ])
  })

  it("draws a cluster that holds a Python or a Vue file from its uses, as one segment, until code blocks read those languages", async () => {
    const pricing = (rate: string): string => ["def price_of(item):", `    return item.price * ${rate}`].join("\n")
    const cart = ["from pricing import price_of", "", "def subtotal(items):", "    return [price_of(item) for item in items]"].join("\n")
    const { segments } = await codegraphOf({ base: { "pricing.py": pricing("1"), "cart.py": cart }, head: { "pricing.py": pricing("2"), "cart.py": cart } })

    expect(segments.map((segment) => [segment.kind, segment.importGraph.map((file) => file.filePath)])).toStrictEqual([["entry", ["cart.py", "pricing.py"]]])
    expect(segments[0].traceDiagram?.traceNodes.map((node) => node.codeBlocks[0].name)).toStrictEqual(["subtotal", "price_of"])
    expect(segments[0].blastDiagram?.edges).toStrictEqual([{ importer: "cart.py", imported: "pricing.py" }])
    expect(segments[0].codeWalkthrough.files.flatMap((file) => file.waypoints).map((waypoint) => [waypoint.declaration, waypoint.category])).toStrictEqual([["price_of", "function"]])
  })

  it("keeps a deleted file with the first segment of its cluster, as a file of the change in its blast", async () => {
    const cart = (imported: string): string => [`import { priceOf } from "./${imported}"`, "export const subtotal = (items) => items.map(priceOf)"].join("\n")
    const pricing = "export const priceOf = (item) => item.price"
    const { segments } = await codegraphOf({
      base: { "src/old-pricing.ts": pricing, "src/pricing.ts": pricing, "src/cart.ts": cart("old-pricing") },
      head: { "src/pricing.ts": pricing, "src/cart.ts": cart("pricing") },
    })

    expect(segments.map((segment) => segment.importGraph.filter((file) => file.diffType !== null).map((file) => [file.filePath, file.diffType]))).toStrictEqual([
      [["src/cart.ts", "modified"], ["src/old-pricing.ts", "deleted"]],
    ])
    expect(segments[0].blastDiagram?.nodes.map((node) => [node.path, node.diffType])).toStrictEqual([["src/cart.ts", "modified"], ["src/old-pricing.ts", "deleted"]])
  })
})

const HOOKED_CHANGE: FakeChange = {
  base: {
    "src/orders.ts": "export const fetchOrders = () => []",
    "src/page.tsx": ["import { useQuery } from \"lib\"", "import { fetchOrders } from \"./orders\"", "export const OrdersPage = () => {", "  const orders = useQuery({ queryFn: fetchOrders })", "  return <b>{orders.data}</b>", "}"].join("\n"),
  },
  head: {
    "src/orders.ts": "export const fetchOrders = () => [1]",
    "src/page.tsx": ["import { useQuery } from \"lib\"", "import { fetchOrders } from \"./orders\"", "export const OrdersPage = () => {", "  const orders = useQuery({ queryFn: fetchOrders })", "  return <b>{orders.data}</b>", "}"].join("\n"),
  },
}

describe("the components of a trace", () => {
  it("are one node, typed as a component, that holds the hook, with the effect of the hook and its callback in the node of that effect", async () => {
    const { segments } = await codegraphOf(HOOKED_CHANGE)
    const [component, , effect] = segments.flatMap((segment) => segment.traceDiagram?.traceNodes ?? [])

    expect([component.id, component.type]).toStrictEqual(["src/page.tsx#component@3:1", "component"])
    expect(component.codeBlocks.map((block) => block.type)).toContain("component-effect")
    expect(effect.codeBlocks.map((block) => block.id)).toStrictEqual(["src/page.tsx#component-effect@4:18", "src/page.tsx#effect-callback@4:29"])
  })
})
