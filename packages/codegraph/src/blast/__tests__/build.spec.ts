import { buildBlast, labelBlastFiles } from "@/blast/build"
import type { ReviewViewContext } from "@/review-view-context"
import type { Blast, Segment } from "@flightplan/configurations"

const segmentWith = (blastDiagram: Blast | null): Segment => ({
  id: "stock",
  title: "Stock check",
  changedPaths: [],
  context: "",
  traceDiagram: null,
  blastDiagram,
  walkthrough: { files: [] },
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
    expect(band?.views[0].summary).toStrictEqual(["4 files", "3 changed", "2 imports", "1 not assessed"])
  })

  it("marks a file of the change by what the diff did to it, and keys only the marks it draws", () => {
    const band = buildBlast(segmentWith(BLAST), "", NO_FILE_SECTIONS, CONTEXT)

    expect(band?.views[0].board.nodes.map((node) => [node.label, node.mark, node.markLabel])).toStrictEqual([
      ["cart/index.ts", "plain", "Not assessed"],
      ["legacy/pricing.ts", "deleted", "Deleted"],
      ["src/pricing.ts", "modified", "Modified"],
      ["types.ts", "added", "Added"],
    ])
    expect(band?.views[0].legend.map((entry) => entry.mark)).toStrictEqual(["added", "modified", "deleted", "plain"])
  })

  it("gives one view to a blast without an import bound, and opens on it", () => {
    const band = buildBlast(segmentWith(BLAST), "", NO_FILE_SECTIONS, CONTEXT)

    expect(band?.views.map((view) => [view.id, view.label])).toStrictEqual([["export-bound", "Export bound"]])
    expect(band?.defaultViewId).toBe("export-bound")
  })

  it("draws the import bound as a second view: the files the change uses, plain, with no assessment", () => {
    const importBound = {
      nodes: [
        { path: "src/pricing.ts", diffType: "modified" as const },
        { path: "src/rates.ts", diffType: null },
      ],
      edges: [{ importer: "src/pricing.ts", imported: "src/rates.ts" }],
    }
    const band = buildBlast({ ...segmentWith({ ...ASSESSED, importBound }), changedPaths: ["src/pricing.ts"] }, "", NO_FILE_SECTIONS, CONTEXT)
    const view = band?.views[1]

    expect(band?.views.map((held) => held.id)).toStrictEqual(["export-bound", "import-bound"])
    expect(band?.defaultViewId).toBe("export-bound")
    expect(view).toMatchObject({ label: "Import bound", summary: ["2 files", "1 changed", "1 import", "1 used by the change"] })
    expect(view?.legend).toStrictEqual([{ mark: "modified", label: "Modified file" }, { mark: "plain", label: "File the change uses" }])
    expect(view?.board.nodes.map((node) => [node.id, node.mark, node.markLabel, node.impactNote, node.assessment, node.isUnassessed])).toStrictEqual([
      ["src/pricing.ts", "modified", "Modified", null, null, false],
      ["src/rates.ts", "plain", "Used by the change", "The change uses this file. Nothing the change does can affect it.", null, false],
    ])
    expect(view?.board.edges.map((edge) => edge.id)).toStrictEqual(["src/pricing.ts>src/rates.ts"])
  })

  it("opens on the import bound when no file but those of the change is in the export bound", () => {
    const pricing = { path: "src/pricing.ts", diffType: "modified" as const }
    const blastDiagram = {
      nodes: [{ ...pricing, impactType: null, impactReason: null }],
      edges: [],
      importBound: { nodes: [pricing, { path: "src/rates.ts", diffType: null }], edges: [{ importer: "src/pricing.ts", imported: "src/rates.ts" }] },
    }

    expect(buildBlast({ ...segmentWith(blastDiagram), changedPaths: ["src/pricing.ts"] }, "", NO_FILE_SECTIONS, CONTEXT)?.defaultViewId).toBe("import-bound")
  })

  it("gives the assessment an author can edit to a file the change reaches, and none to a file of the change or an unreached file", () => {
    const band = buildBlast(segmentWith(ASSESSED), "", NO_FILE_SECTIONS, CONTEXT)

    expect(band?.views[0].board.nodes.map((node) => [node.id, node.assessment])).toStrictEqual([
      ["src/badge.ts", { impactType: "breaks", impactReason: "It assumes the price is never negative." }],
      ["src/cart.ts", { impactType: "unaffected", impactReason: "" }],
      ["src/page.ts", null],
      ["src/pricing.ts", null],
      ["src/report.ts", { impactType: "unassessed", impactReason: "" }],
      ["src/types.ts", null],
    ])
    expect(band?.assessmentForm.choices).toStrictEqual([
      { value: "unassessed", label: "Not assessed", hasReason: false },
      { value: "breaks", label: "Breaks", hasReason: true },
      { value: "behaviour-changes", label: "Behaviour changes", hasReason: true },
      { value: "unaffected", label: "Unaffected", hasReason: false },
    ])
  })

  it("marks only a file the change breaks or changes, and draws every other untouched file plain with a note for the side panel", () => {
    const band = buildBlast(segmentWith(ASSESSED), "", NO_FILE_SECTIONS, CONTEXT)

    expect(band?.views[0].board.nodes.map((node) => [node.id, node.mark, node.markLabel, node.impactNote])).toStrictEqual([
      ["src/badge.ts", "breaks", "Breaks", null],
      ["src/cart.ts", "plain", "Unaffected", "The change reaches this file, and nothing it does is different."],
      ["src/page.ts", "plain", "Not reached by the change", "The change cannot reach this file."],
      ["src/pricing.ts", "modified", "Modified", null],
      ["src/report.ts", "plain", "Not assessed", "Nobody has assessed what the change does to this file."],
      ["src/types.ts", "plain", "Not reached by the change", "The change cannot reach this file."],
    ])
    expect(band?.views[0].legend.map((entry) => entry.mark)).toStrictEqual(["modified", "breaks", "plain"])
    expect(band?.views[0].summary).toStrictEqual(["6 files", "1 changed", "5 imports", "1 breaks", "1 unaffected", "1 not assessed"])
  })

  it("gives a file its impact reason as prose, and none where nothing is written", () => {
    const nodes = buildBlast(segmentWith(ASSESSED), "", NO_FILE_SECTIONS, CONTEXT)?.views[0].board.nodes ?? []

    expect(nodes[0].impactReason).toStrictEqual([{ kind: "paragraph", inlines: [{ kind: "text", text: "It assumes the price is never negative." }] }])
    expect(nodes[2].impactReason).toBeNull()
  })

  it("lists on a file the files that import it and the files it imports", () => {
    const pricing = buildBlast(segmentWith(BLAST), "", NO_FILE_SECTIONS, CONTEXT)?.views[0].board.nodes.find((node) => node.id === "src/pricing.ts")

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

    expect(band?.views[0].board.nodes.map((node) => node.fileLink?.anchorId ?? null)).toStrictEqual([null, null, "file-2", null])
  })

  it("draws an edge for each import between the two files it joins", () => {
    const band = buildBlast(segmentWith(BLAST), "", NO_FILE_SECTIONS, CONTEXT)

    expect(band?.views[0].board.edges.map(({ id, importerId, importedId, points }) => [id, importerId, importedId, points.length])).toStrictEqual([
      ["src/cart/index.ts>src/pricing.ts", "src/cart/index.ts", "src/pricing.ts", 2],
      ["src/pricing.ts>src/types.ts", "src/pricing.ts", "src/types.ts", 2],
    ])
  })
})
