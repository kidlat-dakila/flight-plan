import { join } from "node:path"
import { fileURLToPath } from "node:url"
import type { Codegraph, CodegraphSegment } from "@flightplan/codegraph"
import {
  caseSnapshotOf,
  caseTitleOf,
  readStoredWrittenParts,
  serializeCase,
  snapshotNameOf,
  snapshotPathOf,
} from "@test-setup/case-snapshot"
import { NOTHING_WRITTEN } from "@test-setup/written-parts"

const STOCK_SNAPSHOT_PATH = fileURLToPath(
  new URL("../../test-cases/typescript/snapshots/modified-function-stockof-to-subtract-held-stock.snapshot.json", import.meta.url),
)

describe("caseTitleOf", () => {
  it("is the name of the test, without its suites", () => {
    expect(caseTitleOf("typescript > Modified function stockOf to subtract held stock")).toBe(
      "Modified function stockOf to subtract held stock",
    )
  })
})

describe("snapshotNameOf", () => {
  it("names a snapshot after the test, without its suites", () => {
    expect(snapshotNameOf("typescript > Modified function stockOf to subtract held stock")).toBe(
      "modified-function-stockof-to-subtract-held-stock",
    )
  })

  it("replaces what a file name cannot hold", () => {
    expect(snapshotNameOf("traces `a/b.ts` (re-exported)")).toBe("traces-a-b-ts-re-exported")
  })
})

describe("snapshotPathOf", () => {
  it("puts the snapshot in the snapshots folder beside the test", () => {
    expect(snapshotPathOf("/test-cases/typescript/typescript.integration.test.ts", "typescript > traces a call")).toBe(
      "/test-cases/typescript/snapshots/traces-a-call.snapshot.json",
    )
  })
})

describe("caseSnapshotOf", () => {
  const change = { title: "Modified function stockOf", diff: "diff --git a/stock.ts b/stock.ts\n@@ -1 +1 @@" }
  const codegraph: Codegraph = { segments: [] }

  const segmentOf = (title: string | null): CodegraphSegment => ({
    title,
    kind: "entry",
    importGraph: [],
    journeyFlowDiagram: null,
    blastRadiusDiagram: null,
    codeWalkthrough: { files: [] },
    codeReferences: [],
  })

  const writtenSegmentOf = (title: string, context: string[]) => ({
    title,
    context,
    journeyFlowDiagram: null,
    codeWalkthrough: { files: [] },
  })

  it("puts the title, the diff and the codegraph in that order, the diff as one line per entry", () => {
    const snapshot = caseSnapshotOf(change, codegraph, NOTHING_WRITTEN)

    expect(snapshot).toStrictEqual({
      title: "Modified function stockOf",
      diff: ["diff --git a/stock.ts b/stock.ts", "@@ -1 +1 @@"],
      codegraph: { segments: [] },
    })
    expect(Object.keys(snapshot)).toStrictEqual(["title", "diff", "codegraph"])
  })

  it("keeps the context written for each segment, under the segment's title", () => {
    const written = {
      codegraph: {
        segments: [
          writtenSegmentOf("Stock check", ["Held stock is subtracted."]),
          writtenSegmentOf("Stock badge", ["The badge shows the held stock."]),
        ],
      },
    }

    const { segments } = caseSnapshotOf(change, { segments: [segmentOf(null), segmentOf(null)] }, written).codegraph

    expect(segments.map((segment) => segment.context)).toStrictEqual([["Held stock is subtracted."], ["The badge shows the held stock."]])
    expect(Object.keys(segments[0]).slice(0, 2)).toStrictEqual(["title", "context"])
  })

  it("leaves the context of a segment empty when nothing is written for it", () => {
    const { segments } = caseSnapshotOf(change, { segments: [segmentOf(null)] }, NOTHING_WRITTEN).codegraph

    expect(segments[0].context).toStrictEqual([])
  })
})

describe("readStoredWrittenParts", () => {
  it("reads nothing written for a snapshot that does not exist yet", async () => {
    await expect(readStoredWrittenParts(join(import.meta.dirname, "no-such.snapshot.json"))).resolves.toStrictEqual(NOTHING_WRITTEN)
  })

  it("reads the segments of a committed snapshot with the context of each", async () => {
    const written = await readStoredWrittenParts(STOCK_SNAPSHOT_PATH)

    expect(written.codegraph.segments).toHaveLength(1)
    expect(written.codegraph.segments[0].context).toContain("## Overview")
  })
})

describe("serializeCase", () => {
  it("writes a map as the record of its entries, at any depth", () => {
    const value = { files: [{ filePath: "src/cart.ts", importedFilePaths: new Map([["./pricing", "src/pricing.ts"]]) }] }

    expect(JSON.parse(serializeCase(value))).toStrictEqual({
      files: [{ filePath: "src/cart.ts", importedFilePaths: { "./pricing": "src/pricing.ts" } }],
    })
  })

  it("indents what it writes, so a snapshot reads line by line", () => {
    expect(serializeCase({ segments: [] })).toBe("{\n  \"segments\": []\n}")
  })
})
