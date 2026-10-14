import { cutSegments, listReachedFilePaths } from "@/code-blocks/segments"
import { codeOf, groupOf, rangeAt, type FixtureFiles } from "./group-fixture"

const CHANGE = rangeAt(1, 1, 1, 7)

const fileUsing = (...names: readonly string[]): string =>
  codeOf(...names.map((name) => `import { ${name} } from "./${name}"`), `export const self = () => [${names.map((name) => `${name}()`).join(", ")}]`)

const fileHandingOver = (...names: readonly string[]): string =>
  codeOf(...names.map((name) => `import { ${name} } from "./${name}"`), `export const self = () => [${names.join(", ")}]`)

const leaf = (name: string): string => `export const ${name} = () => 1`

const component = (name: string): string => `export const ${name} = () => <main />`

const ROUTER = codeOf(
  "import { createBrowserRouter } from \"react-router\"",
  "import { Layout } from \"./Layout\"",
  "import { PageA } from \"./PageA\"",
  "import { PageB } from \"./PageB\"",
  "export const router = createBrowserRouter([",
  "  { path: \"/\", element: <Layout />, children: [",
  "    { path: \"a\", element: <PageA /> },",
  "    { path: \"b\", element: <PageB /> },",
  "  ] },",
  "])",
)

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

  it("makes a changed file two changed pages reach shared, though one file uses it, so each page is a line of its own", () => {
    const files = {
      "src/listPage.ts": fileUsing("list", "client").replace("self", "listPage"),
      "src/editPage.ts": fileUsing("form", "client").replace("self", "editPage"),
      "src/list.ts": fileUsing("client").replace("self", "list"),
      "src/form.ts": fileUsing("client").replace("self", "form"),
      "src/client.ts": fileUsing("router").replace("self", "client"),
      "src/router.ts": fileUsing("todos").replace("self", "router"),
      "src/todos.ts": leaf("todos"),
    }

    expect(segmentsOf(files, ["src/listPage.ts", "src/editPage.ts", "src/list.ts", "src/form.ts", "src/router.ts", "src/todos.ts"])).toStrictEqual([
      ["shared", ["src/router.ts", "src/todos.ts"]],
      ["entry", ["src/editPage.ts", "src/form.ts"]],
      ["entry", ["src/list.ts", "src/listPage.ts"]],
    ])
  })

  it("keeps a changed file with the changed files it runs, however many, as one line", () => {
    const files = { "src/page.ts": fileUsing("tabA", "tabB"), "src/tabA.ts": leaf("tabA"), "src/tabB.ts": leaf("tabB") }

    expect(segmentsOf(files, ["src/page.ts", "src/tabA.ts", "src/tabB.ts"])).toStrictEqual([["entry", ["src/page.ts", "src/tabA.ts", "src/tabB.ts"]]])
  })

  it("makes a changed file that hands two lines of change over without running them shared, as a route table is", () => {
    const files = { "src/routes.ts": fileHandingOver("pageA", "pageB"), "src/pageA.ts": leaf("pageA"), "src/pageB.ts": leaf("pageB") }

    expect(segmentsOf(files, ["src/routes.ts", "src/pageA.ts", "src/pageB.ts"])).toStrictEqual([
      ["shared", ["src/routes.ts"]],
      ["entry", ["src/pageA.ts"]],
      ["entry", ["src/pageB.ts"]],
    ])
  })

  it("starts no line at a file a file hands over when that file runs it too, or hands over nothing else", () => {
    const files = {
      "src/page.ts": codeOf("import { tabA } from \"./tabA\"", "import { tabB } from \"./tabB\"", "export const page = () => [tabA, tabA(), tabB]"),
      "src/tabA.ts": leaf("tabA"),
      "src/tabB.ts": leaf("tabB"),
    }

    expect(segmentsOf(files, Object.keys(files))).toStrictEqual([["entry", ["src/page.ts", "src/tabA.ts", "src/tabB.ts"]]])
  })

  it("joins a changed file to the line of the one changed file that leads to it, through unchanged and shared files", () => {
    const files = {
      "src/routes.ts": fileHandingOver("pageA", "pageB").replace("self", "routes"),
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

  it("makes a route table that writes the elements of two changed pages shared, and each page a line of its own", () => {
    const files = { "src/router.tsx": ROUTER, "src/Layout.tsx": component("Layout"), "src/PageA.tsx": component("PageA"), "src/PageB.tsx": component("PageB") }

    expect(segmentsOf(files, ["src/router.tsx", "src/PageA.tsx", "src/PageB.tsx"])).toStrictEqual([
      ["shared", ["src/router.tsx"]],
      ["entry", ["src/PageA.tsx"]],
      ["entry", ["src/PageB.tsx"]],
    ])
  })

  it("makes the changed layout of a route whose children hold the pages shared, beside the route table", () => {
    const files = { "src/router.tsx": ROUTER, "src/Layout.tsx": component("Layout"), "src/PageA.tsx": component("PageA"), "src/PageB.tsx": component("PageB") }

    expect(segmentsOf(files, Object.keys(files))).toStrictEqual([
      ["shared", ["src/Layout.tsx", "src/router.tsx"]],
      ["entry", ["src/PageA.tsx"]],
      ["entry", ["src/PageB.tsx"]],
    ])
  })

  it("keeps a component that renders two changed components in its markup on one line with them", () => {
    const files = {
      "src/Page.tsx": codeOf("import { TabA } from \"./TabA\"", "import { TabB } from \"./TabB\"", "export const Page = () => <main><TabA /><TabB /></main>"),
      "src/TabA.tsx": component("TabA"),
      "src/TabB.tsx": component("TabB"),
    }

    expect(segmentsOf(files, Object.keys(files))).toStrictEqual([["entry", ["src/Page.tsx", "src/TabA.tsx", "src/TabB.tsx"]]])
  })

  it("keeps a route table that hands one page over on the line of that page, with the parts the page runs", () => {
    const files = {
      "src/routes.ts": fileHandingOver("page").replace("self", "routes"),
      "src/page.ts": fileUsing("hook", "row", "filter").replace("self", "page"),
      "src/hook.ts": leaf("hook"),
      "src/row.ts": leaf("row"),
      "src/filter.ts": leaf("filter"),
    }

    expect(segmentsOf(files, Object.keys(files))).toStrictEqual([["entry", ["src/filter.ts", "src/hook.ts", "src/page.ts", "src/routes.ts", "src/row.ts"]]])
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

  it("stops at a file of the shared segment, and holds no file that uses the change only through it", () => {
    const group = groupOf(files, { "src/format.ts": [rangeAt(1, 39, 1, 44)], "src/invoice.ts": [rangeAt(2, 29, 2, 40)] })

    expect(listReachedFilePaths(group, ["src/format.ts"], ["src/invoice.ts"])).toStrictEqual([])
    expect(listReachedFilePaths(group, ["src/format.ts"])).toStrictEqual(["src/report.ts"])
  })

  it("holds no file for a change nothing outside the change uses", () => {
    const group = groupOf(files, { "src/report.ts": [rangeAt(2, 29, 2, 38)] })

    expect(listReachedFilePaths(group, ["src/report.ts"])).toStrictEqual([])
  })
})
