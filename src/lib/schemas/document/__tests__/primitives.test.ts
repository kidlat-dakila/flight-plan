import { describe, expect, it } from "vitest"
import {
  lineRange,
  refTarget,
  repoName,
  sha,
} from "../primitives"

describe("lineRange", () => {
  it("should read a pair as an inclusive range", () => {
    expect(lineRange.parse([145, 163])).toEqual({ from: 145, to: 163 })
  })

  it("should normalise a reversed pair", () => {
    // An author who writes them the wrong way round means the same range, and
    // refusing it would cost a waypoint over punctuation.
    expect(lineRange.parse([163, 145])).toEqual({ from: 145, to: 163 })
  })

  it("should refuse line zero", () => {
    // Files are numbered from one. A zero means the author counted an offset.
    expect(lineRange.safeParse([0, 5]).success).toBe(false)
  })
})

describe("refTarget", () => {
  it("should read a symbol", () => {
    expect(refTarget.parse({ symbol: "hasStock" })).toEqual({ symbol: "hasStock" })
  })

  it("should read a focus and normalise it", () => {
    expect(refTarget.parse({ focus: [145, 163] })).toEqual({
      focus: { from: 145, to: 163 },
    })
  })

  it("should refuse both at once", () => {
    // Two answers to one question. Which wins would be invisible in the render.
    expect(refTarget.safeParse({ symbol: "hasStock", focus: [1, 2] }).success).toBe(
      false,
    )
  })

  it("should refuse an empty symbol", () => {
    expect(refTarget.safeParse({ symbol: "" }).success).toBe(false)
  })
})

describe("repoName", () => {
  it("should accept a nested GitLab group", () => {
    // Two or more segments, not exactly two: a self-managed GitLab nests.
    expect(repoName.safeParse("group/subgroup/project").success).toBe(true)
  })

  it("should refuse a bare name", () => {
    expect(repoName.safeParse("storefront").success).toBe(false)
  })
})

describe("sha", () => {
  it("should refuse a branch name", () => {
    // The failure this exists to prevent: `head: main` reads every file at the
    // wrong commit and silently disables staleness.
    expect(sha.safeParse("main").success).toBe(false)
  })

  it("should accept a full commit", () => {
    expect(sha.safeParse("4a12380000000000000000000000000000000000").success).toBe(
      true,
    )
  })

  it("should refuse an abbreviated commit", () => {
    expect(sha.safeParse("4a12380").success).toBe(false)
  })
})
