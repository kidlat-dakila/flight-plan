import { describe, expect, test } from "vitest"
import { renderMarkdown } from "../markdown"

/*
 * The one HTML construct a document may use, and the whole of the rest of HTML
 * it may not.
 *
 * A walkthrough can arrive from a pull request comment, so its Markdown is
 * written by anybody who can comment on that pull request. `html` therefore
 * stays off, and `<details>` is added as a block rule over three exact lines.
 * These tests are the boundary of that allowance: the second half matters more
 * than the first.
 */
const render = renderMarkdown

describe("a disclosure in a waypoint's prose", () => {
  test("renders as a details element with the author's own label", () => {
    const html = render(
      ["<details>", "<summary>In and out</summary>", "", "Prose.", "", "</details>"].join(
        "\n",
      ),
    )
    expect(html).toContain("<details>")
    expect(html).toContain("<summary>In and out</summary>")
    expect(html).toContain("</details>")
  })

  test("parses the Markdown inside it, fences and tables included", () => {
    const html = render(
      [
        "<details>",
        "<summary>Examples</summary>",
        "",
        "A node whose `type` is wrong:",
        "",
        "```ts",
        'safeParse({ id: "walk" })',
        "```",
        "",
        "| in | out |",
        "| --- | --- |",
        "| `{}` | one problem |",
        "",
        "</details>",
      ].join("\n"),
    )
    expect(html).toContain('class="language-ts"')
    expect(html).toContain("safeParse")
    expect(html).toContain("<table>")
    expect(html).toContain("<code>type</code>")
  })

  test("renders Markdown in the label too", () => {
    const html = render("<summary>In and out of `walk()`</summary>")
    expect(html).toContain("<summary>In and out of <code>walk()</code></summary>")
  })
})

describe("every other tag stays text", () => {
  test.each([
    ["a script", "<script>alert(1)</script>", "&lt;script&gt;"],
    ["an image handler", "<img src=x onerror=alert(1)>", "&lt;img"],
    ["a javascript href", '<a href="javascript:alert(1)">x</a>', "&lt;a href"],
    ["an iframe", '<iframe src="https://example.com"></iframe>', "&lt;iframe"],
    ["a form", '<form action="https://example.com">', "&lt;form"],
  ])("%s is escaped", (_what, markdown, escaped) => {
    const html = render(markdown)
    expect(html).toContain(escaped)
  })

  test("a details with an attribute is escaped, so no example starts open", () => {
    // The fold is the point of the construct. `open` would give a document a
    // way to opt out of it, and the rule is anchored to refuse that.
    const html = render(["<details open>", "<summary>x</summary>", "</details>"].join("\n"))
    expect(html).toContain("&lt;details open&gt;")
    expect(html).not.toContain("<details open>")
  })

  test("a details inside a fence is code, not a region", () => {
    const html = render(["```html", "<details>", "```"].join("\n"))
    expect(html).toContain("&lt;details&gt;")
  })
})
