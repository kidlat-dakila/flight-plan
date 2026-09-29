import { readFileSync } from "node:fs"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { Pre } from "codehike/code"
import { describe, expect, test } from "vitest"
import { POPUP_CODE_CLASS } from "../CodeLinks"
import { buildHandlers } from "../handlers"
import { highlightSnippet } from "../../highlight"

/**
 * What the hover popup puts in the DOM, rendered the way `CodeLinks` renders it.
 *
 * The bug this pins: the popup carried `fp-code-link-code` alone, while the one
 * rule that dims an unfocused line is `.fp-pre[data-fp-has-focus="true"]
 * .fp-line[data-fp-focused="false"]`. Every attribute the rule needs was on the
 * element and the class it also needs was not, so the annotation was applied
 * and never drawn — nothing to see and nothing to report but "no focus".
 */
async function popup(annotate: (code: Awaited<ReturnType<typeof highlightSnippet>>) => void) {
  const code = await highlightSnippet(
    ["const a = 1", "const b = 2", "const c = 3"].join("\n"),
    "ts",
    "github-dark",
  )
  annotate(code)
  return renderToStaticMarkup(
    createElement(Pre, {
      className: POPUP_CODE_CLASS,
      code,
      handlers: buildHandlers({ lineNumbers: true, fileStart: 10, wordWrap: false }),
    }),
  )
}

const focused = (from: number, to: number) => (code: { annotations: unknown[] }) => {
  code.annotations.push({ name: "focus", query: "", fromLineNumber: from, toLineNumber: to })
}

describe("the code-link popup's markup", () => {
  test("carries the class the focus rule selects on, beside its own", async () => {
    const html = await popup(focused(2, 2))
    const pre = /<pre[^>]*>/.exec(html)?.[0] ?? ""
    // Both, in either order: the shared one so the stylesheet's rules apply,
    // its own so the popup can still be sized and scrolled separately.
    expect(pre).toContain("fp-pre")
    expect(pre).toContain("fp-code-link-code")
  })

  test("renders the pair of attributes the focus rule needs", async () => {
    const html = await popup(focused(2, 2))
    expect(/<pre[^>]*>/.exec(html)?.[0]).toContain('data-fp-has-focus="true"')
    expect(html).toContain('data-fp-focused="false"')
    expect(html).toContain('data-fp-focused="true"')
  })

  /*
   * The other half of the coupling, which a markup test cannot see.
   *
   * The tests above prove the popup renders `fp-pre` and the two attributes.
   * They would go on passing if somebody renamed the class in the stylesheet,
   * and the popup would go back to being silently unstyled — which is exactly
   * how this bug arrived. So the rule itself is pinned here.
   */
  test("is styled by a rule that still selects on that class", () => {
    const css = readFileSync(
      new URL("../../styles/renderer.css", import.meta.url),
      "utf8",
    )
    expect(css).toContain(
      '.fp-pre[data-fp-has-focus="true"] .fp-line[data-fp-focused="false"]',
    )
  })

  test("draws a diff band when the excerpt carries one", async () => {
    const html = await popup((code) => {
      focused(2, 2)(code)
      code.annotations.push({ name: "diff", query: "+", fromLineNumber: 2, toLineNumber: 2 })
    })
    expect(html).toContain('data-fp-diff="add"')
  })
})
