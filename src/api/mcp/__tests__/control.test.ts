import { describe, expect, it } from "vitest"
import { readControlLine, type OpenRequest } from "../control"

/** The server's stdout lines, extension end: `{open}` and `{completed}`. */
describe("control channel, extension end", () => {
  const collect = () => {
    const opened: OpenRequest[] = []
    const completed: string[] = []
    return {
      opened,
      completed,
      handlers: {
        open: (request: OpenRequest) => opened.push(request),
        completed: (id: string) => completed.push(id),
      },
    }
  }

  it("should hand an open line and a completed line to their handlers", () => {
    const seen = collect()
    readControlLine(JSON.stringify({ open: { kind: "plan", repo: "acme/storefront", name: "x" } }), seen.handlers)
    readControlLine(JSON.stringify({ completed: { id: "walkthrough/acme/storefront/pr-412" } }), seen.handlers)
    expect(seen.opened).toEqual([{ kind: "plan", repo: "acme/storefront", name: "x" }])
    expect(seen.completed).toEqual(["walkthrough/acme/storefront/pr-412"])
  })

  it("should drop lines that are not control lines", () => {
    const seen = collect()
    readControlLine("completed, but not JSON", seen.handlers)
    readControlLine(JSON.stringify({ completed: { id: 7 } }), seen.handlers)
    readControlLine(JSON.stringify({ completed: {} }), seen.handlers)
    readControlLine(JSON.stringify({ ready: { port: 1 } }), seen.handlers)
    readControlLine('"completed"', seen.handlers)
    expect(seen.opened).toEqual([])
    expect(seen.completed).toEqual([])
  })
})
