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
  it("makes one segment per cluster of the import graph, and none for a file no language reads", async () => {
    const { segments } = await codegraphOf(STOREFRONT_CHANGE)

    expect(segments.map((segment) => segment.importGraph.map((file) => file.filePath))).toStrictEqual([
      ["src/cart.ts", "src/pricing.ts", "src/types.ts", "src/ui.ts"],
      ["src/logger.ts"],
    ])
    expect(segments.map((segment) => segment.astGraph.astGraphFiles.map((file) => file.filePath))).toStrictEqual([
      ["src/cart.ts", "src/pricing.ts", "src/types.ts", "src/ui.ts"],
      ["src/logger.ts"],
    ])
  })

  it("places the changed lines of the diff in the files of each segment", async () => {
    const { segments } = await codegraphOf(STOREFRONT_CHANGE)
    const [, pricing, types] = segments[0].astGraph.astGraphFiles

    expect(pricing.listDiffLocations().map((location) => [location.diffLoC, location.rootEncapsulation.name])).toStrictEqual([[[4, 4], "priceOf"]])
    expect(types.listLooseDiffLines()).toStrictEqual([[1, 4]])
  })

  it("draws the journey of each segment from an entry point down to its change", async () => {
    const { segments } = await codegraphOf(STOREFRONT_CHANGE)

    expect(segments.map((segment) => segment.journeyFlowDiagram?.id)).toStrictEqual(["journey:src/pricing.ts#priceOf", "journey:src/logger.ts#log"])
    expect(segments[0].journeyFlowDiagram?.nodes.map((node) => node.id)).toStrictEqual([
      "entry:src/ui.ts#CheckoutButton:Not used yet",
      "src/pricing.ts#priceOf",
      "src/cart.ts#Cart",
      "src/ui.ts#CheckoutButton",
    ])
    expect(segments[0].journeyFlowDiagram?.edges.map((edge) => [edge.from, edge.to])).toStrictEqual([
      ["entry:src/ui.ts#CheckoutButton:Not used yet", "src/ui.ts#CheckoutButton"],
      ["src/cart.ts#Cart", "src/pricing.ts#priceOf"],
      ["src/ui.ts#CheckoutButton", "src/cart.ts#Cart"],
    ])
  })

  it("draws the blast of a segment from its import graph: every file once, and an edge for each import", async () => {
    const { segments } = await codegraphOf(STOREFRONT_CHANGE)
    const { importGraph, blastRadiusDiagram } = segments[0]

    expect(blastRadiusDiagram.nodes).toStrictEqual(importGraph.map((file) => ({ path: file.filePath, diffType: file.diffType, impactType: null, impactReason: null })))
    expect(blastRadiusDiagram.edges).toStrictEqual(
      importGraph.flatMap((file) => file.importsTo.map((imported) => ({ importer: file.filePath, imported }))),
    )
    expect(blastRadiusDiagram.nodes.filter((node) => node.diffType !== null).map((node) => node.path)).toStrictEqual(["src/pricing.ts", "src/types.ts"])
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
    ])
  })

  it("still gives a blast, and no journey, to a segment whose only change is an import", async () => {
    const pricing = "export const priceOf = (item) => item.price"
    const cart = (imported: string): string => [`import { ${imported} } from "./pricing"`, "", "export const subtotal = (items) => items.map(priceOf)"].join("\n")
    const { segments } = await codegraphOf({
      base: { "src/pricing.ts": pricing, "src/cart.ts": cart("priceOf") },
      head: { "src/pricing.ts": pricing, "src/cart.ts": cart("priceOf, taxOf") },
    })

    expect(segments).toHaveLength(1)
    expect(segments[0].journeyFlowDiagram).toBeNull()
    expect(segments[0].blastRadiusDiagram).toStrictEqual({
      nodes: [{ path: "src/cart.ts", diffType: "modified", impactType: null, impactReason: null }, { path: "src/pricing.ts", diffType: null, impactType: null, impactReason: null }],
      edges: [{ importer: "src/cart.ts", imported: "src/pricing.ts" }],
    })
    expect(segments[0].codeWalkthrough.files.flatMap((file) => file.waypoints).map((waypoint) => [waypoint.declaration, waypoint.category])).toStrictEqual([
      ["Lines 1–1", "import"],
    ])
  })

  it("gives no segments for a change without a file a language reads", async () => {
    const { segments } = await codegraphOf({ base: { "README.md": "# Shop" }, head: { "README.md": "# Storefront" } })

    expect(segments).toStrictEqual([])
  })
})
