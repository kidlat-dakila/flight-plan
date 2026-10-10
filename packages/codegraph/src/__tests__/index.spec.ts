import { BASE_COMMIT, createFakeGitAdapter, HEAD_COMMIT, type FakeChange } from "@/import-graph/__tests__/fake-git-adapter"
import { buildBranchCodegraph, buildCodegraph, type Codegraph } from "@/index"
import { STOREFRONT_CHANGE } from "./change-fixture"

const codegraphOf = async (change: FakeChange): Promise<Codegraph> =>
  await buildCodegraph({ gitAdapter: createFakeGitAdapter(change), baseCommit: BASE_COMMIT, headCommit: HEAD_COMMIT })

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
    expect(codegraph).toStrictEqual(await codegraphOf(STOREFRONT_CHANGE))
  })

  it("refuses a branch the repository does not hold", async () => {
    const gitAdapter = createFakeGitAdapter(STOREFRONT_CHANGE)
    vi.spyOn(gitAdapter, "headSha").mockRejectedValue(new Error("sale-prices is not in this checkout."))

    await expect(buildBranchCodegraph({ gitAdapter, ref: { kind: "branch", name: "sale-prices" } })).rejects.toThrow("sale-prices is not in this checkout.")
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

  it("draws the journey of each segment from an entry point down to its change, and none for a file no language reads", async () => {
    const { segments } = await codegraphOf(STOREFRONT_CHANGE)

    expect(segments.map((segment) => segment.journeyFlowDiagram?.id ?? null)).toStrictEqual(["journey:src/pricing.ts#priceOf", "journey:src/logger.ts#log", null])
    expect(segments[0].journeyFlowDiagram?.nodes.map((node) => node.id)).toStrictEqual([
      "entry:src/ui.ts#CheckoutButton:Not used yet",
      "src/pricing.ts#priceOf",
      "src/cart.ts#Cart",
      "src/ui.ts#CheckoutButton",
    ])
    expect(segments[0].journeyFlowDiagram?.edges.map((edge) => [edge.from, edge.to])).toStrictEqual([
      ["entry:src/ui.ts#CheckoutButton:Not used yet", "src/ui.ts#CheckoutButton"],
      ["src/ui.ts#CheckoutButton", "src/cart.ts#Cart"],
      ["src/cart.ts#Cart", "src/pricing.ts#priceOf"],
    ])
  })

  it("draws the blast of a segment from the blocks that use its change: its changed files, the files that use them, and each use once", async () => {
    const { segments } = await codegraphOf(STOREFRONT_CHANGE)

    expect(segments[0].blastRadiusDiagram).toStrictEqual({
      nodes: [
        { path: "src/pricing.ts", diffType: "modified", impactType: null, impactReason: null },
        { path: "src/types.ts", diffType: "modified", impactType: null, impactReason: null },
        { path: "src/cart.ts", diffType: null, impactType: null, impactReason: null },
        { path: "src/ui.ts", diffType: null, impactType: null, impactReason: null },
      ],
      edges: [
        { importer: "src/cart.ts", imported: "src/pricing.ts" },
        { importer: "src/pricing.ts", imported: "src/types.ts" },
        { importer: "src/ui.ts", imported: "src/cart.ts" },
      ],
    })
  })

  it("gives an entry segment no blast when nothing outside the change uses it, in a change of several segments", async () => {
    const { segments } = await codegraphOf(STOREFRONT_CHANGE)

    expect(segments.map((segment) => segment.blastRadiusDiagram === null)).toStrictEqual([false, true, true])
  })

  it("numbers the waypoints through every segment and links each to the diagrams of its own", async () => {
    const { segments } = await codegraphOf(STOREFRONT_CHANGE)
    const waypoints = segments.flatMap((segment) => segment.codeWalkthrough.files).flatMap((file) => file.waypoints.map((waypoint) => ({ path: file.path, ...waypoint })))

    expect(waypoints.map(({ id, path, declaration, category, journeyFlowId, journeyNodeId }) => ({ id, path, declaration, category, journeyFlowId, journeyNodeId }))).toStrictEqual([
      {
        id: "w1",
        path: "src/pricing.ts",
        declaration: "priceOf",
        category: "function",
        journeyFlowId: "journey:src/pricing.ts#priceOf",
        journeyNodeId: "src/pricing.ts#priceOf",
      },
      {
        id: "w2",
        path: "src/types.ts",
        declaration: "Item",
        category: "type",
        journeyFlowId: "journey:src/pricing.ts#priceOf",
        journeyNodeId: null,
      },
      {
        id: "w3",
        path: "src/logger.ts",
        declaration: "log",
        category: "function",
        journeyFlowId: "journey:src/logger.ts#log",
        journeyNodeId: "src/logger.ts#log",
      },
      {
        id: "w4",
        path: "README.md",
        declaration: "Lines 1–3",
        category: "file",
        journeyFlowId: null,
        journeyNodeId: null,
      },
    ])
  })

  it("gives the only segment of a change a blast, and no journey when its only change is an import", async () => {
    const pricing = "export const priceOf = (item) => item.price"
    const cart = (imported: string): string => [`import { ${imported} } from "./pricing"`, "", "export const subtotal = (items) => items.map(priceOf)"].join("\n")
    const { segments } = await codegraphOf({
      base: { "src/pricing.ts": pricing, "src/cart.ts": cart("priceOf") },
      head: { "src/pricing.ts": pricing, "src/cart.ts": cart("priceOf, taxOf") },
    })

    expect(segments).toHaveLength(1)
    expect(segments[0].journeyFlowDiagram).toBeNull()
    expect(segments[0].blastRadiusDiagram).toStrictEqual({ nodes: [{ path: "src/cart.ts", diffType: "modified", impactType: null, impactReason: null }], edges: [] })
    expect(segments[0].codeWalkthrough.files.flatMap((file) => file.waypoints).map((waypoint) => [waypoint.declaration, waypoint.category])).toStrictEqual([
      ["Lines 1–1", "import"],
    ])
  })

  it("splits a change into the shared segment, with no journey, and one entry segment per line of change, each with the journey of its own line", async () => {
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
    expect(segments.map((segment) => segment.journeyFlowDiagram?.nodes.flatMap((node) => (node.kind === "declaration" ? [node.declaration] : [])) ?? null)).toStrictEqual([
      null,
      ["format", "pageA"],
      ["format", "pageB"],
    ])
    expect(segments.map((segment) => segment.blastRadiusDiagram?.nodes.map((node) => node.path) ?? null)).toStrictEqual([
      ["src/format.ts", "src/main.ts", "src/pageA.ts", "src/pageB.ts"],
      ["src/pageA.ts", "src/main.ts"],
      ["src/pageB.ts", "src/main.ts"],
    ])
    expect(segments.map((segment) => segment.codeWalkthrough.files.map((file) => file.path))).toStrictEqual([["src/format.ts"], ["src/pageA.ts"], ["src/pageB.ts"]])
  })

  it("draws a cluster that holds a Python or a Vue file from its uses, as one segment, until code blocks read those languages", async () => {
    const pricing = (rate: string): string => ["def price_of(item):", `    return item.price * ${rate}`].join("\n")
    const cart = ["from pricing import price_of", "", "def subtotal(items):", "    return [price_of(item) for item in items]"].join("\n")
    const { segments } = await codegraphOf({ base: { "pricing.py": pricing("1"), "cart.py": cart }, head: { "pricing.py": pricing("2"), "cart.py": cart } })

    expect(segments.map((segment) => [segment.kind, segment.importGraph.map((file) => file.filePath)])).toStrictEqual([["entry", ["cart.py", "pricing.py"]]])
    expect(segments[0].journeyFlowDiagram?.nodes.flatMap((node) => (node.kind === "declaration" ? [node.declaration] : []))).toStrictEqual(["price_of", "subtotal"])
    expect(segments[0].blastRadiusDiagram?.edges).toStrictEqual([{ importer: "cart.py", imported: "pricing.py" }])
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
    expect(segments[0].blastRadiusDiagram?.nodes.map((node) => [node.path, node.diffType])).toStrictEqual([["src/cart.ts", "modified"], ["src/old-pricing.ts", "deleted"]])
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

describe("the components of a journey", () => {
  it("carry the hooks of the component that lead to a change, read from the code blocks of the same change", async () => {
    const { segments } = await codegraphOf(HOOKED_CHANGE)
    const components = segments.flatMap((segment) => segment.journeyFlowDiagram?.nodes ?? []).flatMap((node) => (node.kind === "declaration" && node.category === "ui" ? [node] : []))

    expect(components.map((node) => [node.id, node.states, node.hooks, node.effects])).toStrictEqual([
      ["src/page.tsx#OrdersPage", [], [{ name: "useQuery", changeType: "related", reference: [4, 4] }], []],
    ])
  })
})
