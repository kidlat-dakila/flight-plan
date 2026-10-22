import { blockNamed, codeOf } from "@/code-blocks/__tests__/group-fixture"
import { buildStoredCodeGroupGraph } from "@/code-blocks/build-group"
import { listExportNamings, routePathOf } from "@/code-blocks/languages/file-catalogue"
import { LIBRARIES } from "@/code-blocks/libraries"
import type { FileManifest } from "@/code-blocks/manifests"
import type { StoredCodeGroupGraph } from "@/code-blocks/stored-types"

const WITH_NEXT: readonly string[] = ["next", "react"]

const namedIn = (packagePath: string, packages: readonly string[] = WITH_NEXT): string[] =>
  listExportNamings({ packages, packagePath }, "javascript", LIBRARIES).map(({ exportedName, catalogue }) =>
    [exportedName, catalogue.runs, catalogue.method, catalogue.path].filter((word) => word !== null).join(" "))

const groupOf = (filePath: string, source: string, manifest?: FileManifest): StoredCodeGroupGraph =>
  buildStoredCodeGroupGraph([{ filePath, source, importedFilePaths: new Map<string, string>(), importedBy: [], diffs: [], ...(manifest === undefined ? {} : { manifest }) }])

describe("what the path of a file says of its exports", () => {
  it("names the exports a file pattern of a library the manifest lists says something of", () => {
    expect(namedIn("app/users/page.tsx")).toStrictEqual(["default page /users"])
    expect(namedIn("src/app/api/users/route.ts")).toContain("POST route POST /api/users")
    expect(namedIn("middleware.ts")).toStrictEqual(["middleware middleware"])
  })

  it("names nothing in a private folder of the App Router, at any depth", () => {
    expect(namedIn("app/_components/page.tsx")).toStrictEqual([])
    expect(namedIn("src/app/dashboard/_lib/api/route.ts")).toStrictEqual([])
    expect(namedIn("app/dashboard/_lib/layout.tsx")).toStrictEqual([])
    expect(namedIn("app/%5Fsettings/page.tsx")).toStrictEqual(["default page /_settings"])
  })

  it("names nothing in a repository that does not use the library, and nothing without a manifest", () => {
    expect(namedIn("app/users/page.tsx", ["react"])).toStrictEqual([])
    expect(listExportNamings(undefined, "javascript", LIBRARIES)).toStrictEqual([])
  })

  it("knows a library by the name its manifest installs it under, where that is not the name it is imported by", () => {
    const namedBy = (packages: readonly string[]): string[] =>
      listExportNamings({ packages, packagePath: "shop/allauth/urls.py" }, "python", LIBRARIES).map(({ exportedName, catalogue }) => [exportedName, catalogue.specifier].join(" "))

    expect(namedBy(["django_allauth"])).toStrictEqual(["urlpatterns allauth"])
    expect(namedBy(["allauth"])).toStrictEqual(["urlpatterns allauth"])
    expect(namedBy(["django"])).toStrictEqual([])
  })

  it("reads the URL of a Next.js route as Next.js does, without parallel route slots and through intercepting routes", () => {
    const pages = "{app,src/app}/**/page.{js,jsx,ts,tsx}"

    expect(routePathOf(pages, "app/@modal/login/page.tsx")).toBe("/login")
    expect(routePathOf(pages, "app/feed/@modal/(.)photo/[id]/page.tsx")).toBe("/feed/photo/[id]")
    expect(routePathOf(pages, "app/feed/(..)photo/[id]/page.tsx")).toBe("/photo/[id]")
    expect(routePathOf(pages, "app/a/b/(..)(..)photo/page.tsx")).toBe("/photo")
    expect(routePathOf(pages, "app/(shop)/a/@slot/(..)photo/page.tsx")).toBe("/photo")
    expect(routePathOf(pages, "app/shop/cart/(...)login/page.tsx")).toBe("/login")
    expect(routePathOf(pages, "app/%5Fsettings/page.tsx")).toBe("/_settings")
    expect(routePathOf(pages, "app/blog/[...slug]/page.tsx")).toBe("/blog/[...slug]")
    expect(routePathOf(pages, "app/shop/[[...slug]]/page.tsx")).toBe("/shop/[[...slug]]")
  })

  it("reads the path of a route from the folders under the root its pattern names, without a group in brackets", () => {
    const pages = "{app,src/app}/**/page.{js,jsx,ts,tsx}"
    const files = "{pages,src/pages}/**/[!_]*.{js,jsx,ts,tsx}"

    expect(routePathOf(pages, "app/page.tsx")).toBe("/")
    expect(routePathOf(pages, "src/app/(shop)/cart/[id]/page.tsx")).toBe("/cart/[id]")
    expect(routePathOf(files, "pages/users/index.tsx")).toBe("/users")
    expect(routePathOf(files, "pages/users/[id].tsx")).toBe("/users/[id]")
    expect(routePathOf("{pages,src/pages}/api/**/*.{js,ts}", "src/pages/api/users/[id].ts")).toBe("/api/users/[id]")
    expect(routePathOf("{pages,src/pages}/api/**/*.{js,ts}", "pages/api/users/index.ts")).toBe("/api/users")
    expect(routePathOf("{middleware,src/middleware}.{js,ts}", "middleware.ts")).toBeNull()
  })

  it("leaves what it says on the block behind the export", () => {
    const page = codeOf("export default function UsersPage() {", "  return <h1>Users</h1>", "}")
    const named = groupOf("apps/web/app/users/page.tsx", page, { packages: ["next"], packagePath: "app/users/page.tsx" })

    expect(blockNamed(named, "component", "UsersPage").catalogue).toMatchObject({ specifier: "next", runs: "page", path: "/users" })
    expect(blockNamed(groupOf("apps/web/app/users/page.tsx", page), "component", "UsersPage").catalogue).toBeNull()
  })

  it("joins the methods of a function exported under several of them", () => {
    const route = codeOf("const handler = async (request) => Response.json(await auth(request))", "export { handler as GET, handler as POST }")
    const named = groupOf("app/api/auth/route.ts", route, { packages: ["next"], packagePath: "app/api/auth/route.ts" })

    expect(blockNamed(named, "function", "handler").catalogue).toMatchObject({ runs: "route", method: "GET,POST", path: "/api/auth" })
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
