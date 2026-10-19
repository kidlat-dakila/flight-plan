import {
  controlOfKey,
  dominantAnchorIdOf,
  jumpMenuOf,
  navigatorButtonOf,
  navigatorSignatureOf,
  NO_SECTION_STEPS,
  railAnchorIdsOf,
  sectionStepsOf,
  withSectionSteps,
  type NavigatorRail,
} from "@/lib/navigator-controls"

const VIEWPORT = { top: 56, bottom: 900 }

const RAIL: NavigatorRail = {
  groups: [
    { anchorId: "one", label: "Requests (1/2)", sections: [{ anchorId: "one-context", label: "Context" }, { anchorId: "one-walkthrough", label: "Code Walkthrough" }] },
    { anchorId: "two", label: "Pages (2/2)", sections: [{ anchorId: "two-context", label: "Context" }] },
  ],
  sections: [{ anchorId: "conversation", label: "Conversation" }],
}

describe("dominantAnchorIdOf", () => {
  it("picks the section that fills most of the screen", () => {
    const spans = [
      { anchorId: "context", top: -400, bottom: 200 },
      { anchorId: "walkthrough", top: 200, bottom: 4000 },
    ]

    expect(dominantAnchorIdOf(spans, VIEWPORT)).toBe("walkthrough")
  })

  it("picks a short section that is wholly on screen over a long one that runs past the screen", () => {
    const spans = [
      { anchorId: "context", top: 116, bottom: 470 },
      { anchorId: "traceDiagram", top: 470, bottom: 3400 },
    ]

    expect(dominantAnchorIdOf(spans, VIEWPORT)).toBe("context")
  })

  it("picks no section when none is on screen", () => {
    expect(dominantAnchorIdOf([{ anchorId: "context", top: 1000, bottom: 1400 }], VIEWPORT)).toBeNull()
    expect(dominantAnchorIdOf([], VIEWPORT)).toBeNull()
  })
})

describe("jumpMenuOf", () => {
  it("lists the sections of the segment on screen, the other segments and the sections outside every segment", () => {
    expect(jumpMenuOf(RAIL, "one-walkthrough")).toStrictEqual({
      heading: "Requests (1/2)",
      sections: [
        { anchorId: "one-context", label: "Context", isHere: false },
        { anchorId: "one-walkthrough", label: "Code Walkthrough", isHere: true },
      ],
      otherGroups: [RAIL.groups[1]],
      looseSections: [{ anchorId: "conversation", label: "Conversation", isHere: false }],
    })
  })

  it("starts from the first segment while no section is on screen", () => {
    expect(jumpMenuOf(RAIL, null).heading).toBe("Requests (1/2)")
    expect(jumpMenuOf(RAIL, "conversation").looseSections[0]?.isHere).toBe(true)
  })
})

describe("railAnchorIdsOf", () => {
  it("lists every section of every segment, then the sections outside them", () => {
    expect(railAnchorIdsOf(RAIL)).toStrictEqual(["one-context", "one-walkthrough", "two-context", "conversation"])
  })
})

describe("controlOfKey", () => {
  it("finds the button or the menu a key runs, and never a position", () => {
    const zoomIn = navigatorButtonOf({ key: "z", label: "Zoom in", onRun: vi.fn() })
    const groups = [[{ kind: "position" as const, label: "4 of 15" }], [zoomIn]]

    expect(controlOfKey(groups, "z")).toBe(zoomIn)
    expect(controlOfKey(groups, "q")).toBeNull()
  })
})

describe("navigatorSignatureOf", () => {
  it("changes with what the navigator shows and not with the functions it runs", () => {
    const signatureOf = (label: string) => navigatorSignatureOf([[navigatorButtonOf({ key: "q", label, onRun: vi.fn() })]])

    expect(signatureOf("Collapse all")).toBe(signatureOf("Collapse all"))
    expect(signatureOf("Collapse all")).not.toBe(signatureOf("Expand all"))
  })
})

describe("sectionStepsOf", () => {
  const labelsOf = (anchorId: string): (string | null)[] => {
    const steps = sectionStepsOf(RAIL, anchorId, vi.fn())
    return [steps.back?.label ?? null, steps.next?.label ?? null]
  }

  it("steps to the sections around the one on screen, and names another segment by its position", () => {
    expect(labelsOf("one-context")).toStrictEqual([null, "Next: Code Walkthrough"])
    expect(labelsOf("one-walkthrough")).toStrictEqual(["Back: Context", "Next: Segment (2/2)"])
    expect(labelsOf("two-context")).toStrictEqual(["Back: Segment (1/2)", "Next: Conversation"])
    expect(labelsOf("conversation")).toStrictEqual(["Back: Segment (2/2)", null])
  })

  it("jumps to the section it names", () => {
    const onJump = vi.fn()

    sectionStepsOf(RAIL, "one-walkthrough", onJump).next?.onRun()

    expect(onJump).toHaveBeenCalledWith("two-context")
  })

  it("has no step while no section of the rail is on screen", () => {
    expect(sectionStepsOf(RAIL, null, vi.fn())).toBe(NO_SECTION_STEPS)
  })
})

describe("withSectionSteps", () => {
  it("puts the steps before the controls of the section, and leaves a key the section runs itself to the section", () => {
    const steps = sectionStepsOf(RAIL, "one-walkthrough", vi.fn())
    const previousWaypoint = navigatorButtonOf({ key: "a", label: "Previous waypoint", onRun: vi.fn() })

    expect(withSectionSteps([[previousWaypoint]], steps)).toStrictEqual([[steps.next], [previousWaypoint]])
    expect(withSectionSteps([], NO_SECTION_STEPS)).toStrictEqual([])
  })
})
