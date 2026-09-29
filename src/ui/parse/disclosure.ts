/**
 * The one HTML construct a document may use: a collapsed disclosure.
 *
 * A walkthrough with an example under every waypoint is a walkthrough nobody
 * scrolls to the end of, so the examples sit behind a fold that opens when the
 * reader wants them. `<details>` is the construct for that, and it is the only
 * one worth reaching outside Markdown for: the panel and GitHub both render
 * it, and on GitHub it arrives collapsed without anything being asked of
 * the reader.
 *
 * These three patterns are the whole allowance, and they are deliberately
 * anchored to a line of their own with no attributes. Raw HTML stays off in the
 * renderer — `MarkdownIt({ html: false })` — so anything that is not one of
 * these three exact lines is escaped and shown as text, including `<details
 * open>`, `<img onerror=…>` and `<script>`. That makes this an allowance by
 * construction rather than a sanitiser with a list of things it hopes to catch,
 * which matters because a document can arrive from a pull request comment
 * anybody is able to write.
 *
 * `<details open>` is refused on purpose as well as by accident. An example
 * that starts open has saved nobody anything, and the fold is the point.
 *
 * Its own module so the renderer (`../markdown`) and its tests read the same
 * three patterns.
 */

/** Opens a disclosure. A line of its own, no attributes. */
export const DISCLOSURE_OPEN = /^<details>\s*$/

/** Closes one. */
export const DISCLOSURE_CLOSE = /^<\/details>\s*$/

/** The label, whose text the author writes. Markdown inside it is rendered. */
export const DISCLOSURE_SUMMARY = /^<summary>(.*)<\/summary>\s*$/
