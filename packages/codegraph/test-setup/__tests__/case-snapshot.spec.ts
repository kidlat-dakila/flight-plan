import { serializeCase, snapshotNameOf, snapshotPathOf } from "@test-setup/case-snapshot"

describe("snapshotNameOf", () => {
  it("names a snapshot after the test, without its suites", () => {
    expect(snapshotNameOf("typescript > builds the codegraph of a change to one function")).toBe(
      "builds-the-codegraph-of-a-change-to-one-function",
    )
  })

  it("replaces what a file name cannot hold", () => {
    expect(snapshotNameOf("traces `a/b.ts` (re-exported)")).toBe("traces-a-b-ts-re-exported")
  })
})

describe("snapshotPathOf", () => {
  it("puts the snapshot in the snapshots folder beside the test", () => {
    expect(snapshotPathOf("/playground/typescript/typescript.integration.test.ts", "typescript > traces a call")).toBe(
      "/playground/typescript/snapshots/traces-a-call.snapshot.json",
    )
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
