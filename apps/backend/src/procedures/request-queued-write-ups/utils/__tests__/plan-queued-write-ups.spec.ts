import { WALKTHROUGH_ONLY_ARTIFACT } from "@/procedures/read-artifact/utils/__tests__/artifact-fixture"
import { planQueuedWriteUps, queuedAskOf } from "@/procedures/request-queued-write-ups/utils/plan-queued-write-ups"
import type { ReviewArtifact, Waypoint } from "@flightplan/configurations"

const withWrittenWaypoint = (artifact: ReviewArtifact, waypointId: string): ReviewArtifact => ({
  ...artifact,
  segments: artifact.segments.map((segment) => ({
    ...segment,
    walkthrough: {
      files: segment.walkthrough.files.map((file) => ({
        ...file,
        waypoints: file.waypoints.map((waypoint): Waypoint => (waypoint.id === waypointId ? { ...waypoint, title: "Written", reading: "Written." } : waypoint)),
      })),
    },
  })),
})

describe("planQueuedWriteUps", () => {
  it("asks for each queued target that is still unwritten and makes the review drafting", () => {
    const queued = planQueuedWriteUps({ ...WALKTHROUGH_ONLY_ARTIFACT, status: "complete" }, [
      { kind: "waypoint", waypointId: "w2" },
      { kind: "waypoint", waypointId: "w3" },
    ])

    expect(queued.artifact.status).toBe("drafting")
    expect(queued.asks).toStrictEqual([
      "The reviewer asks for the write-up of the waypoint `w2` alone: write its title and its reading, and nothing else.",
      "The reviewer asks for the write-up of the waypoint `w3` alone: write its title and its reading, and nothing else.",
    ])
  })

  it("drops a queued target the running agent already wrote", () => {
    const written = withWrittenWaypoint(WALKTHROUGH_ONLY_ARTIFACT, "w2")

    expect(planQueuedWriteUps(written, [{ kind: "waypoint", waypointId: "w2" }]).asks).toStrictEqual([])
  })
})

describe("queuedAskOf", () => {
  it("keeps one ask as it is and lists several under one lead", () => {
    expect(queuedAskOf(["Write w2."])).toBe("Write w2.")
    expect(queuedAskOf(["Write w2.", "Write w3."])).toBe(
      "The reviewer asked for these write-ups while you were busy. Do each one as it asks:\n- Write w2.\n- Write w3.",
    )
  })
})
