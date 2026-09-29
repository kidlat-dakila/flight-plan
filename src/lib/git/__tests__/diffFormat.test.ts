import { describe, expect, it } from "vitest"
import { headerPath, parseHunkHeader } from "../diffFormat"

describe("parseHunkHeader", () => {
  it("reads both sides with their counts", () => {
    expect(parseHunkHeader("@@ -12,7 +14,9 @@ function x() {")).toEqual({
      oldStart: 12,
      oldCount: 7,
      newStart: 14,
      newCount: 9,
    })
  })

  it("takes a missing count as one line, as git writes it", () => {
    expect(parseHunkHeader("@@ -3 +4 @@")).toEqual({ oldStart: 3, oldCount: 1, newStart: 4, newCount: 1 })
  })

  it("keeps a zero count, which marks a hunk that only deletes or only adds", () => {
    expect(parseHunkHeader("@@ -48 +47,0 @@")?.newCount).toBe(0)
    expect(parseHunkHeader("@@ -0,0 +1,3 @@")?.oldCount).toBe(0)
  })

  it("is null for anything that is not a hunk header", () => {
    expect(parseHunkHeader("+++ b/src/a.ts")).toBeNull()
    expect(parseHunkHeader(" @@ -1 +1 @@")).toBeNull()
  })
})

describe("headerPath", () => {
  it("drops the side's own prefix", () => {
    expect(headerPath("+++ b/src/a.ts")).toBe("src/a.ts")
    expect(headerPath("--- a/src/a.ts")).toBe("src/a.ts")
  })

  it("keeps a top-level folder named like the other side's prefix", () => {
    expect(headerPath("+++ b/a/x.ts")).toBe("a/x.ts")
    expect(headerPath("+++ a/x.ts")).toBe("a/x.ts")
  })

  it("is null for /dev/null", () => {
    expect(headerPath("--- /dev/null")).toBeNull()
    expect(headerPath("+++ /dev/null")).toBeNull()
  })

  it("drops the tab git appends to a path with a space", () => {
    expect(headerPath("+++ b/my file.ts\t")).toBe("my file.ts")
  })
})
