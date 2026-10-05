import type { DeclarationSpan } from "@/procedures/request-review/utils/scaffold/declarations"
import type { Hunk } from "@/procedures/request-review/utils/scaffold/hunks"
import { scaffoldFiles, touchedDeclarations, type ChangedFile } from "@/procedures/request-review/utils/scaffold/sections"

const declaration = (name: string, lineStart: number, lineEnd: number, kind: DeclarationSpan["kind"] = "callable"): DeclarationSpan => ({
  name,
  lineStart,
  lineEnd,
  kind,
})

const hunkOf = (...added: readonly (readonly [number, number])[]): Hunk => ({
  added: added.map(([lineStart, lineEnd]) => ({ lineStart, lineEnd })),
  removed: [],
  isCreated: false,
})

const DECLARATIONS = [
  declaration("LIMIT", 1, 1, "other"),
  declaration("priceOf", 3, 8),
  declaration("Cart", 10, 30, "container"),
  declaration("Cart.add", 12, 15),
  declaration("Cart.remove", 17, 20),
]

const createFile = (overrides: Partial<ChangedFile> = {}): ChangedFile => ({
  path: "src/cart.ts",
  hunk: hunkOf([4, 5]),
  declarations: DECLARATIONS,
  ...overrides,
})

describe("touchedDeclarations", () => {
  it("names the innermost declaration a range touches, not the container around it", () => {
    expect(touchedDeclarations(DECLARATIONS, { lineStart: 13, lineEnd: 13 }).map(({ name }) => name)).toStrictEqual(["Cart.add"])
  })

  it("names the container when the range touches none of its members", () => {
    expect(touchedDeclarations(DECLARATIONS, { lineStart: 25, lineEnd: 26 }).map(({ name }) => name)).toStrictEqual(["Cart"])
  })

  it("leaves out a declaration nested in a function", () => {
    const nested = [declaration("total", 1, 10), declaration("total.inner", 3, 4)]

    expect(touchedDeclarations(nested, { lineStart: 3, lineEnd: 3 }).map(({ name }) => name)).toStrictEqual(["total"])
  })
})

describe("scaffoldFiles", () => {
  it("gives a block of changed lines inside one declaration a draft waypoint anchored to that declaration", () => {
    expect(scaffoldFiles([createFile()])).toStrictEqual([
      {
        section: {
          path: "src/cart.ts",
          title: "src/cart.ts",
          summary: [],
          waypoints: [
            { id: "w1", title: null, declaration: "priceOf", reading: "", needsAttention: null, findings: [], children: [] },
          ],
        },
        anchors: { priceOf: { lineStart: 3, lineEnd: 8 } },
      },
    ])
  })

  it("gives two blocks in the same declaration one waypoint", () => {
    const [file] = scaffoldFiles([createFile({ hunk: hunkOf([4, 4], [7, 7]) })])

    expect(file.section.waypoints.map((waypoint) => waypoint.declaration)).toStrictEqual(["priceOf"])
  })

  it("anchors a block that spans several declarations to its own lines, named after them", () => {
    const [file] = scaffoldFiles([createFile({ hunk: hunkOf([1, 13]) })])

    expect(file.anchors).toStrictEqual({ "LIMIT, priceOf, Cart.add": { lineStart: 1, lineEnd: 13 } })
  })

  it("shortens a long list of declarations in a name", () => {
    const [file] = scaffoldFiles([createFile({ hunk: hunkOf([1, 18]) })])

    expect(file.section.waypoints.map((waypoint) => waypoint.declaration)).toStrictEqual(["LIMIT, priceOf, Cart.add +1 more"])
  })

  it("anchors a block to its lines when it touches no declaration or the file could not be read", () => {
    const [outside] = scaffoldFiles([createFile({ hunk: hunkOf([40, 42]) })])
    const [unread] = scaffoldFiles([createFile({ declarations: null })])

    expect(outside.anchors).toStrictEqual({ "Lines 40–42": { lineStart: 40, lineEnd: 42 } })
    expect(unread.anchors).toStrictEqual({ "Lines 4–5": { lineStart: 4, lineEnd: 5 } })
  })

  it("orders the waypoints of a file by line and numbers them across files", () => {
    const files = scaffoldFiles([
      createFile({ hunk: hunkOf([18, 18], [4, 4]) }),
      createFile({ path: "src/other.ts", hunk: hunkOf([2, 2]), declarations: [] }),
    ])

    expect(files.map((file) => file.section.waypoints.map((waypoint) => `${waypoint.id}:${waypoint.declaration}`))).toStrictEqual([
      ["w1:priceOf", "w2:Cart.remove"],
      ["w3:Lines 2–2"],
    ])
  })

  it("leaves out a file the change only removes lines from", () => {
    expect(scaffoldFiles([createFile({ hunk: { added: [], removed: [{ afterLine: 2, lines: ["gone"] }], isCreated: false } })])).toStrictEqual([])
  })
})
