import { buildBlast, labelBlastFiles } from "@/blast/build"
import type { ReviewViewContext } from "@/review-view-context"
import type { Blast, Segment } from "@flightplan/configurations"

const segmentWith = (blast: Blast | null): Segment => ({
  id: "stock",
  title: "Stock check",
  changedPaths: [],
  context: "",
  journey: null,
  blast,
  walkthrough: { intro: null, files: [] },
})

const BLAST: Blast = {
  nodes: [
    { path: "src/cart/index.ts", diffType: null, impactType: null, impactReason: null },
    { path: "src/legacy/pricing.ts", diffType: "deleted", impactType: null, impactReason: null },
    { path: "src/pricing.ts", diffType: "modified", impactType: null, impactReason: null },
    { path: "src/types.ts", diffType: "added", impactType: null, impactReason: null },
  ],
  edges: [
    { importer: "src/cart/index.ts", imported: "src/pricing.ts" },
    { importer: "src/pricing.ts", imported: "src/types.ts" },
  ],
}

const NO_FILE_SECTIONS = new Map<string, string>()

const CONTEXT: ReviewViewContext = {
  sources: [],
  solutionTokens: new Map(),
  knownLinkIds: new Set(),
  definitionIds: new Set(),
  blobLinkOf: () => null,
}

const ASSESSED: Blast = {
  nodes: [
    { path: "src/badge.ts", diffType: null, impactType: "breaks", impactReason: "It assumes the price is never negative." },
    { path: "src/cart.ts", diffType: null, impactType: "unaffected", impactReason: null },
    { path: "src/page.ts", diffType: null, impactType: null, impactReason: null },
    { path: "src/pricing.ts", diffType: "modified", impactType: null, impactReason: null },
    { path: "src/report.ts", diffType: null, impactType: null, impactReason: null },
    { path: "src/types.ts", diffType: null, impactType: null, impactReason: null },
  ],
  edges: [
    { importer: "src/badge.ts", imported: "src/pricing.ts" },
    { importer: "src/cart.ts", imported: "src/pricing.ts" },
    { importer: "src/page.ts", imported: "src/cart.ts" },
    { importer: "src/report.ts", imported: "src/pricing.ts" },
    { importer: "src/pricing.ts", imported: "src/types.ts" },
  ],
}

describe("labelBlastFiles", () => {
  it("labels a file with its name, and a folder's entry file with its folder", () => {
    expect([...labelBlastFiles(["src/pricing.ts", "src/cart/index.ts", "app/models/__init__.py"])]).toStrictEqual([
      ["src/pricing.ts", "pricing.ts"],
      ["src/cart/index.ts", "cart/index.ts"],
      ["app/models/__init__.py", "models/__init__.py"],
    ])
  })

  it("adds folders to a label until no other file shares it", () => {
    expect([...labelBlastFiles(["src/legacy/pricing.ts", "src/pricing.ts", "lib/src/pricing.ts"]).values()]).toStrictEqual([
      "legacy/pricing.ts",
      "src/pricing.ts",
      "lib/src/pricing.ts",
    ])
  })
})

describe("buildBlast", () => {
  it("gives no band to a segment without a blast, or with an empty one", () => {
    expect(buildBlast(segmentWith(null), "", NO_FILE_SECTIONS, CONTEXT)).toBeNull()
    expect(buildBlast(segmentWith({ nodes: [], edges: [] }), "", NO_FILE_SECTIONS, CONTEXT)).toBeNull()
  })

  it("counts the files, the changed files, the imports and the files left to assess, and scopes the anchor", () => {
    const band = buildBlast(segmentWith(BLAST), "stock-", NO_FILE_SECTIONS, CONTEXT)

    expect(band?.anchorId).toBe("stock-blast-diagram")
    expect(band?.summary).toStrictEqual(["4 files", "3 changed", "2 imports", "1 not assessed"])
  })

  it("marks a file of the change by what the diff did to it, and keys only the marks it draws", () => {
    const band = buildBlast(segmentWith(BLAST), "", NO_FILE_SECTIONS, CONTEXT)

    expect(band?.board.nodes.map((node) => [node.label, node.mark, node.markLabel])).toStrictEqual([
      ["cart/index.ts", "plain", "Not assessed"],
      ["legacy/pricing.ts", "deleted", "Deleted"],
      ["src/pricing.ts", "modified", "Modified"],
      ["types.ts", "added", "Added"],
    ])
    expect(band?.legend.map((entry) => entry.mark)).toStrictEqual(["added", "modified", "deleted", "plain"])
  })

  it("marks only a file the change breaks or changes, and draws every other untouched file plain with a note for the side panel", () => {
    const band = buildBlast(segmentWith(ASSESSED), "", NO_FILE_SECTIONS, CONTEXT)

    expect(band?.board.nodes.map((node) => [node.id, node.mark, node.markLabel, node.impactNote])).toStrictEqual([
      ["src/badge.ts", "breaks", "Breaks", null],
      ["src/cart.ts", "plain", "Unaffected", "The change reaches this file, and nothing it does is different."],
      ["src/page.ts", "plain", "Not reached by the change", "The change cannot reach this file."],
      ["src/pricing.ts", "modified", "Modified", null],
      ["src/report.ts", "plain", "Not assessed", "Nobody has assessed what the change does to this file."],
      ["src/types.ts", "plain", "Not reached by the change", "The change cannot reach this file."],
    ])
    expect(band?.legend.map((entry) => entry.mark)).toStrictEqual(["modified", "breaks", "plain"])
    expect(band?.summary).toStrictEqual(["6 files", "1 changed", "5 imports", "1 breaks", "1 unaffected", "1 not assessed"])
  })

  it("gives a file its impact reason as prose, and none where nothing is written", () => {
    const nodes = buildBlast(segmentWith(ASSESSED), "", NO_FILE_SECTIONS, CONTEXT)?.board.nodes ?? []

    expect(nodes[0].impactReason).toStrictEqual([{ kind: "paragraph", inlines: [{ kind: "text", text: "It assumes the price is never negative." }] }])
    expect(nodes[2].impactReason).toBeNull()
  })

  it("lists on a file the files that import it and the files it imports", () => {
    const pricing = buildBlast(segmentWith(BLAST), "", NO_FILE_SECTIONS, CONTEXT)?.board.nodes.find((node) => node.id === "src/pricing.ts")

    expect(pricing?.importers).toStrictEqual({
      heading: "Imported by 1 file",
      emptyLabel: "No file of this segment imports it.",
      files: [{ id: "src/cart/index.ts", label: "src/cart/index.ts" }],
    })
    expect(pricing?.imports.heading).toBe("Imports 1 file")
    expect(pricing?.imports.files).toStrictEqual([{ id: "src/types.ts", label: "src/types.ts" }])
  })

  it("links a file to its File Section when the Code Walkthrough has one", () => {
    const band = buildBlast(segmentWith(BLAST), "", new Map([["src/pricing.ts", "file-2"]]), CONTEXT)

    expect(band?.board.nodes.map((node) => node.fileLink?.anchorId ?? null)).toStrictEqual([null, null, "file-2", null])
  })

  it("draws an edge for each import between the two files it joins", () => {
    const band = buildBlast(segmentWith(BLAST), "", NO_FILE_SECTIONS, CONTEXT)

    expect(band?.board.edges.map(({ id, importerId, importedId, points }) => [id, importerId, importedId, points.length])).toStrictEqual([
      ["src/cart/index.ts>src/pricing.ts", "src/cart/index.ts", "src/pricing.ts", 2],
      ["src/pricing.ts>src/types.ts", "src/pricing.ts", "src/types.ts", 2],
    ])
  })
})
