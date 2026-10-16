import { EVERY_PATH_PATTERN, pathPatternOf } from "@/code-blocks/languages/typescript/libraries/nextjs-matcher"

const reaches = (matcher: string, paths: readonly string[]): string[] => {
  const pattern = pathPatternOf(matcher)
  return pattern === null ? [] : paths.filter((path) => new RegExp(pattern).test(path))
}

const PATHS: readonly string[] = ["/", "/dashboard", "/dashboard/team/settings", "/api/users", "/api", "/about"]

describe("the paths a Next.js matcher reaches", () => {
  it("reads a parameter with no modifier as one segment, and with * or + as any number of segments", () => {
    expect(reaches("/dashboard/:path*", PATHS)).toStrictEqual(["/dashboard", "/dashboard/team/settings"])
    expect(reaches("/api/:path+", PATHS)).toStrictEqual(["/api/users"])
    expect(reaches("/:slug", PATHS)).toStrictEqual(["/dashboard", "/api", "/about"])
    expect(reaches("/about", PATHS)).toStrictEqual(["/about"])
  })

  it("keeps a group written as a regular expression, a negative lookahead too", () => {
    expect(reaches("/((?!api|_next/static|favicon.ico).*)", PATHS)).toStrictEqual(["/", "/dashboard", "/dashboard/team/settings", "/about"])
  })

  it("reads nothing of a matcher it cannot read", () => {
    expect(pathPatternOf("/{blog}")).toBeNull()
    expect(pathPatternOf("/(unclosed")).toBeNull()
    expect(new RegExp(EVERY_PATH_PATTERN).test("/any/path")).toBe(true)
  })
})
