import { describe, expect, it } from "vitest"
import { buildScaffold } from "../scaffold"

/** A Python file gets symbol-anchored waypoints, like a TypeScript one. */
describe("the scaffold, for a Python file", () => {
  it("anchors a waypoint on the function a change falls in, with no note", async () => {
    const text = ["def price_of(ids):", "    unique = set(ids)", "    return len(unique)", ""].join("\n")
    const out = await buildScaffold({
      root: "/nowhere",
      repo: "acme/storefront",
      head: "4a12380000000000000000000000000000000000",
      base: "c1f1b88000000000000000000000000000000000",
      report: () => undefined,
      read: (path) => Promise.resolve(path === "checkout/pricing.py" ? text : null),
      main: null,
      hunks: { "checkout/pricing.py": { added: [{ from: 2, to: 2 }], removed: [] } },
    })
    expect(out.notes).toEqual([])
    const [section] = out.sections
    expect(section?.scaffolded).toBe(true)
    expect(section?.waypoints.map((one) => one.code?.kind === "ref" ? one.code.target : null)).toEqual([
      { symbol: "price_of" },
    ])
  })
})
