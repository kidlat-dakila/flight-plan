import { BUILT_IN_LIBRARIES } from "@/catalogue/libraries"
import { blockNamed, codeOf } from "@/code-blocks/__tests__/group-fixture"
import { buildStoredCodeGroupGraph } from "@/code-blocks/build-group"
import { listExportNamings, routePathOf } from "@/code-blocks/languages/file-catalogue"
import type { FileManifest } from "@/code-blocks/manifests"
import type { StoredCodeGroupGraph } from "@/code-blocks/stored-types"

const WITH_NEXT: readonly string[] = ["next", "react"]

const namedIn = (packagePath: string, packages: readonly string[] = WITH_NEXT): string[] =>
  listExportNamings({ packages, packagePath }, "javascript", BUILT_IN_LIBRARIES).map(({ exportedName, catalogue }) =>
    [exportedName, catalogue.runs, catalogue.method, catalogue.path].filter((word) => word !== null).join(" "))

const groupOf = (filePath: string, source: string, manifest?: FileManifest): StoredCodeGroupGraph =>
  buildStoredCodeGroupGraph([{ filePath, source, importedFilePaths: new Map<string, string>(), importedBy: [], diffRanges: [], ...(manifest === undefined ? {} : { manifest }) }])

describe("what the path of a file says of its exports", () => {
  it("names the exports a file pattern of a library the manifest lists says something of", () => {
    expect(namedIn("app/users/page.tsx")).toStrictEqual(["default page /users"])
    expect(namedIn("src/app/api/users/route.ts")).toContain("POST route POST /api/users")
    expect(namedIn("middleware.ts")).toStrictEqual(["middleware middleware"])
  })

  it("names nothing in a repository that does not use the library, and nothing without a manifest", () => {
    expect(namedIn("app/users/page.tsx", ["react"])).toStrictEqual([])
    expect(listExportNamings(undefined, "javascript", BUILT_IN_LIBRARIES)).toStrictEqual([])
  })

  it("knows a library by the name its manifest installs it under, where that is not the name it is imported by", () => {
    const namedBy = (packages: readonly string[]): string[] =>
      listExportNamings({ packages, packagePath: "shop/allauth/urls.py" }, "python", BUILT_IN_LIBRARIES).map(({ exportedName, catalogue }) => [exportedName, catalogue.specifier].join(" "))

    expect(namedBy(["django_allauth"])).toStrictEqual(["urlpatterns allauth"])
    expect(namedBy(["allauth"])).toStrictEqual(["urlpatterns allauth"])
    expect(namedBy(["django"])).toStrictEqual([])
  })

  it("reads the path of a route from the folders under the root its pattern names, without a group in brackets", () => {
    const pages = "{app,src/app}/**/page.{js,jsx,ts,tsx}"
    const files = "{pages,src/pages}/**/[!_]*.{js,jsx,ts,tsx}"

    expect(routePathOf(pages, "app/page.tsx")).toBe("/")
    expect(routePathOf(pages, "src/app/(shop)/cart/[id]/page.tsx")).toBe("/cart/[id]")
    expect(routePathOf(files, "pages/users/index.tsx")).toBe("/users")
    expect(routePathOf(files, "pages/users/[id].tsx")).toBe("/users/[id]")
    expect(routePathOf("{middleware,src/middleware}.{js,ts}", "middleware.ts")).toBeNull()
  })

  it("leaves what it says on the block behind the export", () => {
    const page = codeOf("export default function UsersPage() {", "  return <h1>Users</h1>", "}")
    const named = groupOf("apps/web/app/users/page.tsx", page, { packages: ["next"], packagePath: "app/users/page.tsx" })

    expect(blockNamed(named, "component", "UsersPage").catalogue).toMatchObject({ specifier: "next", runs: "page", path: "/users" })
    expect(blockNamed(groupOf("apps/web/app/users/page.tsx", page), "component", "UsersPage").catalogue).toBeNull()
  })
})

describe("what a directive says of a file", () => {
  it("says every exported function of a file that starts with the directive is reached by a request, and no function that is not exported", () => {
    const group = groupOf("src/actions.ts", codeOf("\"use server\"", "export async function saveUser() {}", "function helper() {}"))

    expect(blockNamed(group, "function", "saveUser").catalogue).toMatchObject({ name: "use server", runs: "route", method: "POST" })
    expect(blockNamed(group, "function", "helper").catalogue).toBeNull()
  })

  it("says it of the one function that starts with the directive", () => {
    const group = groupOf("src/page.tsx", codeOf("export async function saveUser() {", "  \"use server\"", "}", "export async function loadUser() {}"))

    expect(blockNamed(group, "function", "saveUser").catalogue).toMatchObject({ runs: "route", method: "POST" })
    expect(blockNamed(group, "function", "loadUser").catalogue).toBeNull()
  })
})
