import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { onTestFinished } from "vitest"
import { NOTHING_WRITTEN, type CaseSnapshot } from "@flightplan/playground-fixtures/test-setup"
import { readTraceWrittenParts, trimCaseSnapshot } from "@test-setup/trace-snapshot"

const SNAPSHOT_PATH = join(import.meta.dirname, "..", "..", "cases", "express-api", "snapshots", "implement-route-patch-tasks-id-complete.snapshot.json")

const WAYPOINT = {
  id: "w1",
  title: "Added greet()",
  declaration: "greet",
  reading: "The author added `greet()`.",
  coreChange: null,
  findings: [],
  range: { lineStart: 1, lineEnd: 3 },
  category: "function",
  traceNodeId: null,
  codeBlockIds: ["src/greeting.ts#function@1:1"],
  children: [],
} as const

const CASE_SNAPSHOT: CaseSnapshot = {
  title: "Implement greeting",
  diff: ["diff --git a/src/greeting.ts b/src/greeting.ts"],
  codegraph: {
    segments: [
      {
        kind: "entry",
        title: "New greet",
        context: ["This segment adds a greeting."],
        importGraph: [],
        traceDiagram: null,
        blastDiagram: null,
        hiddenBlastDiagram: null,
        codeWalkthrough: { files: [{ path: "src/greeting.ts", waypoints: [{ ...WAYPOINT, children: [{ ...WAYPOINT, id: "w1.1" }] }] }] },
        codeReferences: [],
      },
    ],
  },
}

const writeSnapshot = async (text: string): Promise<string> => {
  const folder = await mkdtemp(join(tmpdir(), "trace-snapshot-"))
  onTestFinished(async () => {
    await rm(folder, { recursive: true, force: true })
  })
  const snapshotPath = join(folder, "case.snapshot.json")
  await writeFile(snapshotPath, text)
  return snapshotPath
}

describe("trimCaseSnapshot", () => {
  it("keeps of a segment only what the Trace Band and its side panel draw", () => {
    expect(trimCaseSnapshot(CASE_SNAPSHOT)).toStrictEqual({
      title: "Implement greeting",
      diff: ["diff --git a/src/greeting.ts b/src/greeting.ts"],
      codegraph: {
        segments: [
          {
            title: "New greet",
            importGraph: [],
            traceDiagram: null,
            codeWalkthrough: {
              files: [
                {
                  path: "src/greeting.ts",
                  waypoints: [
                    {
                      id: "w1",
                      declaration: "greet",
                      range: { lineStart: 1, lineEnd: 3 },
                      codeBlockIds: ["src/greeting.ts#function@1:1"],
                      children: [{ id: "w1.1", declaration: "greet", range: { lineStart: 1, lineEnd: 3 }, codeBlockIds: ["src/greeting.ts#function@1:1"], children: [] }],
                    },
                  ],
                },
              ],
            },
            codeReferences: [],
          },
        ],
      },
    })
  })
})

describe("readTraceWrittenParts", () => {
  it("reads the written parts of a trimmed snapshot", async () => {
    const written = await readTraceWrittenParts(SNAPSHOT_PATH)

    expect(written.codegraph.segments[0]?.traceDiagram?.title).toBe("Complete task request flow diagram")
  })

  it("reads nothing written when the snapshot does not exist", async () => {
    await expect(readTraceWrittenParts(join(tmpdir(), "no-such-folder", "case.snapshot.json"))).resolves.toStrictEqual(NOTHING_WRITTEN)
  })

  it("reads nothing written from a snapshot that is not JSON", async () => {
    const snapshotPath = await writeSnapshot("{ not json")

    await expect(readTraceWrittenParts(snapshotPath)).resolves.toStrictEqual(NOTHING_WRITTEN)
  })
})
