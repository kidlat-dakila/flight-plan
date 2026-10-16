import { EVERY_PATH_PATTERN, nestPathPatternOf } from "@/code-blocks/languages/typescript/libraries/nestjs-paths"

const isMatching = (path: string, written: string): boolean => new RegExp(nestPathPatternOf(written) ?? "$^").test(path)

describe("the path pattern of a Nest route", () => {
  it("reads a parameter as one segment, an optional one as one segment or none, and a wildcard as any path", () => {
    expect([isMatching("/cats/7", "cats/:id"), isMatching("/cats/7/toys", "cats/:id"), isMatching("/cats/", "cats/:id?")]).toStrictEqual([true, false, true])
    expect([isMatching("/cats/7/toys", "cats/*"), isMatching("/cats/7/toys", "cats/(.*)"), isMatching("/cats/7/toys", "cats/*splat"), isMatching("/dogs", "cats/*")]).toStrictEqual([true, true, true, false])
  })

  it("reads a group in braces as optional, and a path with or without its slashes alike", () => {
    expect([isMatching("/cats", "cats{/:id}"), isMatching("/cats/7", "/cats{/:id}/"), isMatching("/cats/7/8", "cats{/:id}")]).toStrictEqual([true, true, false])
  })

  it("reads * alone as every path", () => {
    expect(nestPathPatternOf("*")).toBe("^/.*/?$")
    expect(new RegExp(EVERY_PATH_PATTERN).test("/anything/at/all")).toBe(true)
  })
})
