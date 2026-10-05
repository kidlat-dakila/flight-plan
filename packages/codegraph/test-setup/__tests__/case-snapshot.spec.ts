import { snapshotNameOf, snapshotPathOf } from "@test-setup/case-snapshot"

describe("snapshotNameOf", () => {
  it("names a snapshot after the test, without its suites", () => {
    expect(snapshotNameOf("typescript > scaffolds a change to one function")).toBe("scaffolds-a-change-to-one-function")
  })

  it("replaces what a file name cannot hold", () => {
    expect(snapshotNameOf("traces `a/b.ts` (re-exported)")).toBe("traces-a-b-ts-re-exported")
  })
})

describe("snapshotPathOf", () => {
  it("puts the snapshot in the snapshots folder beside the test", () => {
    expect(snapshotPathOf("/cases/typescript/typescript.integration.test.ts", "typescript > traces a call")).toBe(
      "/cases/typescript/snapshots/traces-a-call.snapshot.json",
    )
  })
})
