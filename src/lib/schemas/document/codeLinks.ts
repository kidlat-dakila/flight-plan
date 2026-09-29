/**
 * `code:` links: the one link form agents write in prose, parsed the same way
 * by the server, which resolves them when a document is written, and by the
 * renderer, which shows them.
 */

/**
 * Blanks out code, keeping every other offset where it was.
 *
 * Spaces rather than deletion, so an `Anchor`'s `at` still indexes the text the
 * caller handed in.
 */
export function maskFences(markdown: string): string {
  let fence: string | null = null
  return markdown
    .split("\n")
    .map((line) => {
      const opening = /^\s*(```+|~~~+)/.exec(line)
      if (fence === null) {
        if (opening !== null) {
          fence = opening[1] ?? "```"
          return " ".repeat(line.length)
        }
        return line
      }
      if (opening !== null && (opening[1] ?? "").startsWith(fence)) fence = null
      return " ".repeat(line.length)
    })
    .join("\n")
}

/**
 * A link into the code, written `[label](code:path#L95-96)`.
 *
 * The one link in this format that points at a file rather than at a heading,
 * and it exists for a trigger trace: a numbered list of debugger-like steps
 * reads as prose, and each step has to be able to say *where* without breaking
 * the sentence to open a fence.
 *
 * A scheme rather than a fragment, because `#slug` already means a waypoint and
 * the validator refuses a fragment matching no heading. `code:` cannot be
 * mistaken for either, and it cannot be mistaken for navigation.
 *
 * Two forms after the path, and the first is the one to use:
 *
 *     [`getUser()`](code:src/auth/user.ts#getUser)     a declaration
 *     [9 ranges](code:src/auth/user.ts#L300-320)       lines
 *
 * A symbol is what the sentence already says and needs no counting. Lines are
 * the fallback for what no declaration names — a few lines inside a function, a
 * config entry — and they are the weaker form on purpose: every other reference
 * in this format carries text that repairs it when the file moves, and there is
 * nowhere in the middle of a sentence to put one.
 */
export type CodeLink = {
  /** The bracketed text, which is also what anchors the range. */
  label: string
  path: string
  /** The lines named, or null when the link names a symbol or the whole file. */
  lines: { from: number; to: number } | null
  /**
   * The declaration named, or null when the link names lines.
   *
   * The form to reach for. A symbol is what the sentence already says, needs no
   * counting, and survives the file being edited above it — which a line number
   * written into prose does not, and cannot be made to, because there is
   * nowhere in a sentence to put an anchor.
   */
  symbol: string | null
  /**
   * The target as written, which is the key an excerpt is stored under.
   *
   * Without the pointy brackets when there were any: they are Markdown's
   * punctuation, and the renderer does not put them in the `href` either.
   * Compare it through `linkKey`, never raw — the href comes back URL-encoded.
   */
  target: string
  /** Offset of the link in the markdown handed in. */
  at: number
}

/*
 * One level of nesting is allowed in the label, and it is not a nicety.
 *
 * A label carries the raw values a call was given, and a value that will not
 * fit is written as a shape: `[9 ranges]`, `[1…41]`. Those are the labels the
 * format asks for, and a label pattern of `[^\]]+` matched none of them — the
 * link was silently not a link, which reads as the hover being broken rather
 * than as the syntax being wrong.
 *
 * The alternation cannot cross an unbalanced bracket, so two links on one line
 * still parse as two.
 *
 * Both destination forms, and the second is not an exotic one: a bare
 * destination ends at the first `)`, so a path with a bracket in it —
 * `app/(shop)/orders/[orderId]/page.tsx`, which is an ordinary
 * route — cannot be written without the pointy brackets Markdown provides for
 * exactly this. Those links parsed as no link at all, and showed nothing on
 * hover with nothing to say why.
 *
 * The target is captured whole rather than in parts, because the parts cannot
 * be put back together: `-L?` accepts `#L10-L20` and `#L10-20` both, and only
 * the text as written says which one this author wrote.
 */
const CODE_LINK =
  /\[((?:[^[\]\n]|\[[^[\]\n]*\])+)\]\((?:<(code:[^<>\n]+)>|(code:[^\s)]+))\)/g

/** `#L95-96`, `#L95-L96`, `#L95`, and nothing else is a line range. */
const LINES = /^L(\d+)(?:-L?(\d+))?$/

/**
 * A target split into the file it names and the part of it it points at.
 *
 * The fragment is taken from the *last* `#`, not the first: a fragment never
 * contains one, and a path is free to.
 */
function partsOf(target: string): {
  path: string
  lines: { from: number; to: number } | null
  symbol: string | null
} {
  const rest = target.slice("code:".length)
  const hash = rest.lastIndexOf("#")
  const path = hash < 0 ? rest : rest.slice(0, hash)
  const fragment = hash < 0 ? "" : rest.slice(hash + 1)
  if (fragment === "") return { path, lines: null, symbol: null }

  const range = LINES.exec(fragment)
  if (range === null) return { path, lines: null, symbol: fragment }

  const from = Number(range[1])
  const to = range[2] === undefined ? from : Number(range[2])
  return {
    path,
    lines: { from: Math.min(from, to), to: Math.max(from, to) },
    symbol: null,
  }
}

/**
 * The form a target is compared in.
 *
 * A link is stored under the target its author wrote and looked up by the
 * `href` the Markdown renderer emitted, and those are not always the same
 * string: a destination is a URL, so `[orderId]` comes back out of the
 * renderer as `%5BorderId%5D`. Compared raw, every link in a repository that
 * uses bracketed path segments missed its own excerpt.
 *
 * `decodeURI` rather than `decodeURIComponent`, which would also decode an
 * escaped `#` and split a target in the wrong place. A malformed escape is
 * left exactly as it came: it is somebody's path, not this function's business.
 */
export function linkKey(target: string): string {
  try {
    return decodeURI(target)
  } catch {
    return target
  }
}

/**
 * The identifier a label anchors on, or null when it names no code.
 *
 * The label is the anchor, and that is the whole reason these links can be
 * trusted: everything else in this format carries an `!anchor` so it survives
 * somebody editing above it, and a bare `#L95-96` in a sentence would not.
 *
 * **Backticks are what make a label an anchor.** `` `addToBasket({ id: 7 })` ``
 * anchors on `addToBasket`; "Submit Button" anchors on nothing. Requiring
 * them rather than taking the first word of any label is what keeps the first
 * step of a trace out of this: a trigger is a user action, and "Submit" is not
 * a symbol to look for. It also costs an author nothing, since code in prose is
 * written in backticks throughout this format anyway.
 */
export function labelIdentifier(label: string): string | null {
  const code = /`([^`]+)`/.exec(label)
  if (code === null) return null
  const found = /^[A-Za-z_$][\w$]*/.exec((code[1] ?? "").trim())
  return found === null ? null : found[0]
}

/** Every `code:` link in a block of prose, with fenced code ignored. */
export function parseCodeLinks(markdown: string): CodeLink[] {
  const found: CodeLink[] = []
  for (const match of maskFences(markdown).matchAll(CODE_LINK)) {
    // Pointy brackets or none; what is inside them is the same target either
    // way, and the brackets are Markdown's punctuation rather than part of it.
    const target = match[2] ?? match[3] ?? ""
    const parts = partsOf(target)
    found.push({
      label: match[1] ?? "",
      path: parts.path,
      lines: parts.lines,
      symbol: parts.symbol,
      /*
       * The href exactly as written, never rebuilt from the parts.
       *
       * This is the key the popup is stored under, and the key it is looked up
       * by is the `href` attribute the Markdown renderer emits, which is the
       * author's own text. Rebuilding it dropped the optional `L` in `-L20`, so
       * a link written `#L10-L20` parsed correctly, stored its excerpt under
       * `#L10-20`, and then never matched: no popup, no error, and nothing to
       * suggest the syntax was the problem rather than the feature.
       */
      target,
      at: match.index,
    })
  }
  return found
}
