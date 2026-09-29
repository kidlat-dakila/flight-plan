import { describe, expect, test } from "vitest"
import { parseProseAnchors, slugOf, waypointSlugs } from "../anchor"

describe("slugOf", () => {
  test("lowercases and hyphenates", () => {
    expect(slugOf("Add the detector")).toBe("add-the-detector")
  })

  test("drops punctuation but keeps hyphens and underscores", () => {
    expect(slugOf("`readFile`, and why it refuses")).toBe("readfile-and-why-it-refuses")
    expect(slugOf("read-file_now")).toBe("read-file_now")
  })

  test("keeps letters outside ASCII", () => {
    // A title is prose in the author's own language.
    expect(slugOf("Crème brûlée à la carte")).toBe("crème-brûlée-à-la-carte")
  })

  test("collapses runs of whitespace", () => {
    expect(slugOf("  two   spaces  ")).toBe("two-spaces")
  })
})

describe("waypointSlugs", () => {
  test("disambiguates a repeated title, leaving the first clean", () => {
    // Two sections each with a waypoint called "The guard" is ordinary, and
    // they cannot share an id.
    expect(waypointSlugs(["The guard", "Other", "The guard"])).toEqual([
      "the-guard",
      "other",
      "the-guard-1",
    ])
  })

  test("keeps one entry per waypoint, in order", () => {
    expect(waypointSlugs(["a", "b"])).toHaveLength(2)
  })
})

describe("parseProseAnchors", () => {
  test("finds a fragment link and its slug", () => {
    expect(parseProseAnchors("(See: [Add the detector](#add-the-detector))")).toEqual([
      { text: "Add the detector", slug: "add-the-detector", at: 6 },
    ])
  })

  test("finds several in one item", () => {
    expect(
      parseProseAnchors("- Did a thing. (See: [A](#a), [B](#b))").map((a) => a.slug),
    ).toEqual(["a", "b"])
  })

  test("ignores a link that is not a fragment", () => {
    expect(parseProseAnchors("[docs](https://example.com/#frag)")).toEqual([])
  })

  test("ignores an inline code span", () => {
    expect(parseProseAnchors("Write `[Title](#slug)` like this.")).toEqual([])
  })

  test("ignores a fenced example", () => {
    const markdown = [
      "Real [One](#one).",
      "",
      "```md",
      "- An item. (See: [Example](#example))",
      "```",
      "",
      "Real [Two](#two).",
    ].join("\n")
    expect(parseProseAnchors(markdown).map((a) => a.slug)).toEqual(["one", "two"])
  })

  test("keeps offsets pointing at the original text", () => {
    const markdown = "`[masked](#x)` then [Kept](#kept)"
    const [anchor] = parseProseAnchors(markdown)
    expect(markdown.slice(anchor?.at)).toBe("[Kept](#kept)")
  })
})
