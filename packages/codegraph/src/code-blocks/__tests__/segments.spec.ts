import { cutSegments, listReachedFilePaths } from "@/code-blocks/segments"
import { codeOf, groupOf, rangeAt, type FixtureFiles } from "./group-fixture"

const CHANGE = rangeAt(1, 1, 1, 7)

const fileUsing = (...names: readonly string[]): string =>
  codeOf(...names.map((name) => `import { ${name} } from "./${name}"`), `export const self = () => [${names.map((name) => `${name}()`).join(", ")}]`)

const leaf = (name: string): string => `export const ${name} = () => 1`

const segmentsOf = (files: FixtureFiles, changed: readonly string[]): unknown[] =>
  cutSegments(groupOf(files, Object.fromEntries(changed.map((filePath) => [filePath, [CHANGE]])))).map(({ kind, filePaths }) => [kind, filePaths])

describe("the segments of a group", () => {
  it("makes a changed file two files use the shared segment, and each of its users a line of its own", () => {
    const files = { "src/pageA.ts": fileUsing("component").replace("self", "pageA"), "src/pageB.ts": fileUsing("component").replace("self", "pageB"), "src/component.ts": leaf("component") }

    expect(segmentsOf(files, ["src/pageA.ts", "src/pageB.ts", "src/component.ts"])).toStrictEqual([
      ["shared", ["src/component.ts"]],
      ["entry", ["src/pageA.ts"]],
      ["entry", ["src/pageB.ts"]],
    ])
  })

  it("makes a changed file that leads to two lines of change shared", () => {
    const files = { "src/page.ts": fileUsing("tabA", "tabB"), "src/tabA.ts": leaf("tabA"), "src/tabB.ts": leaf("tabB") }

    expect(segmentsOf(files, ["src/page.ts", "src/tabA.ts", "src/tabB.ts"])).toStrictEqual([
      ["shared", ["src/page.ts"]],
      ["entry", ["src/tabA.ts"]],
      ["entry", ["src/tabB.ts"]],
    ])
  })

  it("joins a changed file to the one line of change below it, through unchanged and shared files", () => {
    const files = {
      "src/routes.ts": fileUsing("pageA", "pageB").replace("self", "routes"),
      "src/pageA.ts": fileUsing("componentA", "componentC", "types").replace("self", "pageA"),
      "src/pageB.ts": fileUsing("componentB", "componentC", "types").replace("self", "pageB"),
      "src/componentA.ts": leaf("componentA"),
      "src/componentB.ts": leaf("componentB"),
      "src/componentC.ts": leaf("componentC"),
      "src/types.ts": leaf("types"),
    }

    expect(segmentsOf(files, ["src/routes.ts", "src/pageA.ts", "src/componentA.ts", "src/componentB.ts", "src/componentC.ts", "src/types.ts"])).toStrictEqual([
      ["shared", ["src/componentC.ts", "src/routes.ts", "src/types.ts"]],
      ["entry", ["src/componentA.ts", "src/pageA.ts"]],
      ["entry", ["src/componentB.ts"]],
    ])
  })

  it("makes a page with several changed parts shared, and the route table that leads to them through it", () => {
    const files = {
      "src/routes.ts": fileUsing("page").replace("self", "routes"),
      "src/page.ts": fileUsing("hook", "row", "filter").replace("self", "page"),
      "src/hook.ts": leaf("hook"),
      "src/row.ts": leaf("row"),
      "src/filter.ts": leaf("filter"),
    }

    expect(segmentsOf(files, Object.keys(files))).toStrictEqual([
      ["shared", ["src/page.ts", "src/routes.ts"]],
      ["entry", ["src/filter.ts"]],
      ["entry", ["src/hook.ts"]],
      ["entry", ["src/row.ts"]],
    ])
  })

  it("leaves a file the diff did not touch out of every segment, and makes one entry segment of a lone change", () => {
    const files = { "src/pageA.ts": fileUsing("button").replace("self", "pageA"), "src/pageB.ts": fileUsing("button").replace("self", "pageB"), "src/button.ts": leaf("button") }

    expect(segmentsOf(files, ["src/pageA.ts", "src/pageB.ts"])).toStrictEqual([
      ["entry", ["src/pageA.ts"]],
      ["entry", ["src/pageB.ts"]],
    ])
    expect(segmentsOf({ "src/button.ts": leaf("button") }, ["src/button.ts"])).toStrictEqual([["entry", ["src/button.ts"]]])
  })
  it("makes one entry segment of the changed files of a group that has no line of change beside them", () => {
    const files = { "src/pageA.ts": fileUsing("format").replace("self", "pageA"), "src/pageB.ts": fileUsing("format").replace("self", "pageB"), "src/format.ts": leaf("format") }

    expect(segmentsOf(files, ["src/format.ts"])).toStrictEqual([["entry", ["src/format.ts"]]])
  })
})

describe("the files a change reaches", () => {
  const format = codeOf("export const formatPrice = (cents) => cents", "export const formatDate = (date) => date")
  const files = {
    "src/format.ts": format,
    "src/invoice.ts": codeOf("import { formatPrice } from \"./format\"", "export const invoice = () => formatPrice(1)"),
    "src/report.ts": codeOf("import { invoice } from \"./invoice\"", "export const report = () => invoice()"),
    "src/calendar.ts": codeOf("import { formatDate } from \"./format\"", "export const calendar = () => formatDate(1)"),
  }

  it("holds a file a block of which uses a changed block, directly or through other blocks, and not one that uses only what did not change", () => {
    const group = groupOf(files, { "src/format.ts": [rangeAt(1, 39, 1, 44)] })

    expect(listReachedFilePaths(group, ["src/format.ts"])).toStrictEqual(["src/invoice.ts", "src/report.ts"])
  })

  it("holds no file for a change nothing outside the change uses", () => {
    const group = groupOf(files, { "src/report.ts": [rangeAt(2, 29, 2, 38)] })

    expect(listReachedFilePaths(group, ["src/report.ts"])).toStrictEqual([])
  })
})
