import type { Codegraph } from "@flightplan/codegraph"
import { SegmentCountError } from "@test-setup/case-labels"
import {
  caseSnapshotOf,
  caseTitleOf,
  MissingCaseContextError,
  serializeCase,
  snapshotNameOf,
  snapshotPathOf,
} from "@test-setup/case-snapshot"

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

  it("puts the title, the context, the diff and the codegraph in that order, text as one line per entry", () => {
    const snapshot = caseSnapshotOf(change, { context: "## Summary\n\nHeld stock is subtracted.", codegraph })

    expect(snapshot).toStrictEqual({
      title: "Modified function stockOf",
      context: ["## Summary", "", "Held stock is subtracted."],
      diff: ["diff --git a/stock.ts b/stock.ts", "@@ -1 +1 @@"],
      codegraph: { segments: [] },
    })
    expect(Object.keys(snapshot)).toStrictEqual(["title", "context", "diff", "codegraph"])
  })

  it("drops the blank lines around the context", () => {
    expect(caseSnapshotOf(change, { context: "\n## Summary\n", codegraph }).context).toStrictEqual(["## Summary"])
  })

  it("refuses a case without a context", () => {
    expect(() => caseSnapshotOf(change, { context: "  \n", codegraph })).toThrow(MissingCaseContextError)
  })

  it("refuses labels for segments the codegraph does not have", () => {
    expect(() => caseSnapshotOf(change, { context: "## Summary", codegraph, segments: [{ title: "Stock" }] })).toThrow(SegmentCountError)
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
