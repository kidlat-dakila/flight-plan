import { createMockProcedureContext } from "@/procedures/context"
import { getCardForm } from "@/procedures/get-card-form"

const KEY = { repositoryName: "storefront", targetId: "pr-412", segmentId: "stock-check" }

const createContext = () => createMockProcedureContext(new Date("2026-10-01T12:00:00.000Z"))

describe("getCardForm", () => {
  it("returns what a card holds, with a labelled kind for every row type and no label twice", async () => {
    const form = await getCardForm({ ...KEY, nodeId: "post-checkout" }, createContext())

    expect(form).toMatchObject({
      nodeId: "post-checkout",
      title: "Modify postCheckout",
      path: "src/api/routes/checkout.ts",
      lineStart: 5,
      lineEnd: 13,
      label: "Checkout endpoint",
      labelPlaceholder: "postCheckout",
      rows: [],
      defaultKind: "call",
    })
    expect(form?.kindOptions).toContainEqual({ value: "render-event", label: "User event" })
    expect(form?.kindOptions).toContainEqual({ value: "code-event", label: "Code event" })
    expect(new Set(form?.kindOptions.map((option) => option.label)).size).toBe(form?.kindOptions.length)
  })

  it("lists the waypoints of the file of the card", async () => {
    const form = await getCardForm({ ...KEY, nodeId: "available-units" }, createContext())

    expect(form?.waypoints.length).toBeGreaterThan(0)
    expect(form?.waypoints.every((waypoint) => waypoint.lineStart <= waypoint.lineEnd)).toBe(true)
  })

  it("reports nothing for a card that is not on the diagram", async () => {
    await expect(getCardForm({ ...KEY, nodeId: "gone" }, createContext())).resolves.toBeNull()
    await expect(getCardForm({ ...KEY, targetId: "pr-416", nodeId: "post-checkout" }, createContext())).resolves.toBeNull()
  })
})
