import { toCaseSnapshot, toReviewSnapshot, type TraceSnapshot } from "@/fixtures/trace-snapshot"

const TRACE_SNAPSHOT: TraceSnapshot = {
  title: "Implement greeting",
  diff: ["diff --git a/src/greeting.ts b/src/greeting.ts"],
  codegraph: {
    segments: [
      {
        title: null,
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
                  children: [
                    { id: "w1.1", declaration: "greet › Condition :2", range: { lineStart: 2, lineEnd: 2 }, codeBlockIds: [], children: [] },
                  ],
                },
              ],
            },
          ],
        },
        codeReferences: [],
      },
    ],
  },
}

describe("toReviewSnapshot", () => {
  it("gives every segment no context and no blast", () => {
    expect(toReviewSnapshot(TRACE_SNAPSHOT)).toMatchObject({
      codegraph: { segments: [{ context: [], blastDiagram: null, hiddenBlastDiagram: null }] },
    })
  })

  it("gives every waypoint, at any depth, no prose", () => {
    expect(toReviewSnapshot(TRACE_SNAPSHOT)).toMatchObject({
      codegraph: {
        segments: [
          {
            codeWalkthrough: {
              files: [
                {
                  waypoints: [
                    {
                      id: "w1",
                      title: null,
                      reading: "",
                      coreChange: null,
                      findings: [],
                      children: [{ id: "w1.1", title: null, reading: "", coreChange: null, findings: [] }],
                    },
                  ],
                },
              ],
            },
          },
        ],
      },
    })
  })
})

describe("toCaseSnapshot", () => {
  it("reads a trace snapshot as a playground snapshot", () => {
    const snapshot = toCaseSnapshot(TRACE_SNAPSHOT)

    expect(snapshot.title).toBe("Implement greeting")
    expect(snapshot.codegraph.segments[0]?.codeWalkthrough.files[0]?.waypoints[0]?.range).toStrictEqual({ lineStart: 1, lineEnd: 3 })
  })
})
