import { describe, expect, it } from "vitest"
import { itemizeWaypointLabels } from "../prose"

/**
 * The transform rewrites authored prose, so the cases that matter are the ones
 * where it must NOT: a paragraph it mangles is worse than one it leaves running
 * together.
 */
describe("itemizeWaypointLabels", () => {
  it("should split a What/Why paragraph into one bullet each", () => {
    const prose =
      "**What** — a third field on `BulkAddPromptsResult`. **Why** — the modal needs to know how many were forced inactive."
    expect(itemizeWaypointLabels(prose)).toBe(
      "- **What** — a third field on `BulkAddPromptsResult`.\n" +
        "- **Why** — the modal needs to know how many were forced inactive.",
    )
  })

  it("should keep trailing prose with the label it follows", () => {
    // From a real generated waypoint. The sentence after Why explains the Why,
    // so it belongs to that bullet rather than to a third one.
    const prose =
      "**What** — the success return. **Why** — carries the count to the modal. " +
      "`rowErrors` stays empty here because a real error still returns earlier."
    expect(itemizeWaypointLabels(prose).split("\n")).toEqual([
      "- **What** — the success return.",
      "- **Why** — carries the count to the modal. `rowErrors` stays empty here because a real error still returns earlier.",
    ])
  })

  it("should handle a third label", () => {
    const prose = "**What** — a guard. **Why** — it can throw. **Where** — above the call."
    expect(itemizeWaypointLabels(prose).split("\n")).toEqual([
      "- **What** — a guard.",
      "- **Why** — it can throw.",
      "- **Where** — above the call.",
    ])
  })

  it("should fold a wrapped item onto one line", () => {
    // A hard-wrapped paragraph would otherwise break out of its list item.
    const prose = "**What** — a field\non the result. **Why** — the modal\nneeds it."
    expect(itemizeWaypointLabels(prose).split("\n")).toEqual([
      "- **What** — a field on the result.",
      "- **Why** — the modal needs it.",
    ])
  })

  it("should leave a paragraph with only one label alone", () => {
    // Nothing to separate, so nothing to gain from a one-item list.
    const prose = "**What** — a third field on the result type."
    expect(itemizeWaypointLabels(prose)).toBe(prose)
  })

  it("should leave a paragraph that does not open with a label alone", () => {
    const prose =
      "This is worth saying: **What** the code does is clear, **Why** it exists is not."
    expect(itemizeWaypointLabels(prose)).toBe(prose)
  })

  it("should leave prose the author already itemized alone", () => {
    const prose = "- **What** — a guard.\n- **Why** — it can throw."
    expect(itemizeWaypointLabels(prose)).toBe(prose)
  })

  it("should only touch the paragraph that opens with a label", () => {
    const prose = [
      "**What** — a guard. **Why** — it can throw.",
      "",
      "The rest of this waypoint is ordinary prose about What and Why.",
    ].join("\n")
    expect(itemizeWaypointLabels(prose)).toBe(
      [
        "- **What** — a guard.",
        "- **Why** — it can throw.",
        "",
        "The rest of this waypoint is ordinary prose about What and Why.",
      ].join("\n"),
    )
  })

  it("should not rewrite inside a fenced block", () => {
    // Reformatting prose is the job; reformatting code is corruption.
    const prose = [
      "```md",
      "**What** — a guard. **Why** — it can throw.",
      "```",
    ].join("\n")
    expect(itemizeWaypointLabels(prose)).toBe(prose)
  })

  it("should keep the top-level block count", () => {
    // A paragraph becomes exactly one list, never several blocks.
    const prose = [
      "**What** — a guard. **Why** — it can throw.",
      "",
      "A second paragraph.",
      "",
      "A third.",
    ].join("\n")
    const blocks = (text: string) =>
      text.split(/\n{2,}/).filter((block) => block.trim() !== "").length
    expect(blocks(itemizeWaypointLabels(prose))).toBe(blocks(prose))
  })

  it("should leave prose with no labels untouched", () => {
    const prose = "Ordinary prose, with **bold** in it and no labels at all."
    expect(itemizeWaypointLabels(prose)).toBe(prose)
  })
})
