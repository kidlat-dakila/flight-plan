import MarkdownIt from "markdown-it"
import { DISCLOSURE_CLOSE, DISCLOSURE_OPEN, DISCLOSURE_SUMMARY } from "./parse/disclosure"

/**
 * The UI's one Markdown renderer.
 *
 * Only the prose fields an agent writes go through here — readings,
 * descriptions, context, summaries — and the guides the extension ships. The
 * structure of a document never does: headings, lists of scenarios, file
 * sections are built from the JSON by `document/view.ts`.
 *
 * markdown-it, the engine VS Code's own preview is built on, synchronous so the
 * UI runs the same in a browser and in the webview.
 */

/**
 * Teaches the renderer `<details>`, and nothing else.
 *
 * A fold needs a construct Markdown does not have. Turning `html` on would
 * supply it and a great deal more: a document is written by whoever opened
 * the pull request, so it could put an `<img onerror=…>` or an `<iframe>` into
 * the panel. A block rule matching three exact lines is the same feature
 * without the rest of HTML, and it needs no sanitiser — everything it does not
 * match stays escaped, because `html` is still false.
 *
 * The rule runs before `paragraph`, which is what stops these lines being
 * swallowed as text, and the content between them is parsed as ordinary
 * Markdown: prose, several fences, a table.
 */
function disclosure(md: MarkdownIt): void {
  md.block.ruler.before("paragraph", "disclosure", (state, startLine, _endLine, silent) => {
    // Indexed by line, and the caller only ever passes a line that exists.
    const begin = state.bMarks[startLine] ?? 0
    const shift = state.tShift[startLine] ?? 0
    const line = state.src.slice(begin + shift, state.eMarks[startLine] ?? 0)

    if (DISCLOSURE_OPEN.test(line)) {
      if (!silent) state.push("details_open", "details", 1).block = true
    } else if (DISCLOSURE_CLOSE.test(line)) {
      if (!silent) state.push("details_close", "details", -1).block = true
    } else {
      const label = DISCLOSURE_SUMMARY.exec(line)
      if (label === null) return false
      if (!silent) {
        state.push("summary_open", "summary", 1).block = true
        // An inline token, so the label may carry code spans and emphasis.
        const inline = state.push("inline", "", 0)
        inline.content = label[1] ?? ""
        inline.children = []
        inline.map = [startLine, startLine + 1]
        state.push("summary_close", "summary", -1).block = true
      }
    }

    state.line = startLine + 1
    return true
  })
}

const md = new MarkdownIt({ html: false, linkify: true, typographer: false }).use(disclosure)

/** A prose field as block HTML: paragraphs, lists, fences, tables. */
export function renderMarkdown(markdown: string): string {
  return md.render(markdown)
}

/** A prose field that sits inside something else: a heading, a list item. */
export function renderInline(markdown: string): string {
  return md.renderInline(markdown)
}

/** Text that is not Markdown, for building HTML around rendered prose. */
export function escapeHtml(text: string): string {
  return md.utils.escapeHtml(text)
}
