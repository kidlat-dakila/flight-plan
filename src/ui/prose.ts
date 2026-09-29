/**
 * Puts a waypoint's What / Why / Where on separate lines.
 *
 * These labels are no longer what the format asks for: a waypoint now opens
 * with a plain reading of its own code, and the reason lives in Context and in
 * the diagram's node descriptions. This is here for the documents that were
 * written before that, and it stays for as long as they do.
 *
 * Authored inline they render as one paragraph, with the labels buried
 * mid-sentence — the reader has to hunt for the break between what the code is
 * and why it is there, which was the one distinction the convention existed to
 * make. A walkthrough stored last month still has to read correctly today, and
 * regenerating one to reformat two labels would discard whatever a person has
 * since written into it.
 *
 * Deliberately narrow. It rewrites a paragraph only when the paragraph *starts*
 * with one of the labels and carries at least two of them, so a sentence that
 * happens to contain the word is untouched. The rewrite is a paragraph into a
 * list: one top-level block either way.
 */

/** The labels a waypoint opens with, longest first so matching is unambiguous. */
const LABELS = ["Where", "What", "Why"] as const

/** `**What**` at the very start of the paragraph. */
const OPENS = new RegExp(`^\\s*\\*\\*(?:${LABELS.join("|")})\\*\\*`)

/** Every `**Label**`, wherever it appears. */
const ANY = new RegExp(`\\*\\*(?:${LABELS.join("|")})\\*\\*`, "g")

/**
 * Splits one paragraph into a bullet per label, or returns it unchanged.
 *
 * The text between two labels belongs to the first of them, so the split points
 * are the labels' own offsets.
 */
function itemize(paragraph: string): string {
  if (!OPENS.test(paragraph)) return paragraph
  // Already a list: the author did it by hand, or this ran before.
  if (/^\s*[-*+]\s/.test(paragraph)) return paragraph

  const starts = [...paragraph.matchAll(ANY)].map((match) => match.index)
  if (starts.length < 2) return paragraph

  const items = starts.map((start, index) =>
    paragraph.slice(start, starts[index + 1] ?? paragraph.length).trim(),
  )
  // Anything before the first label would be lost by slicing from it. There is
  // nothing there when the paragraph opens with a label, but a leading space is
  // possible and is not worth a special case.
  const lead = paragraph.slice(0, starts[0]).trim()
  const list = items.map((item) => `- ${collapse(item)}`).join("\n")
  return lead === "" ? list : `${lead}\n\n${list}`
}

/** Folds a wrapped item onto one line, so it stays one list item. */
function collapse(text: string): string {
  return text.replace(/\s*\n\s*/g, " ")
}

/**
 * Itemizes the opening labels in a waypoint's prose.
 *
 * Paragraphs are blank-line separated, and fenced blocks are passed through
 * untouched: prose rarely carries a fence, but rewriting the inside of one
 * would corrupt code rather than reformat prose.
 */
export function itemizeWaypointLabels(markdown: string): string {
  const lines = markdown.split("\n")
  const out: string[] = []
  let paragraph: string[] = []
  let fence: string | null = null

  const flush = () => {
    if (paragraph.length === 0) return
    out.push(itemize(paragraph.join("\n")))
    paragraph = []
  }

  for (const line of lines) {
    const opener = /^\s*(```+|~~~+)/.exec(line)
    if (fence === null && opener?.[1] !== undefined) {
      flush()
      fence = opener[1][0] === "`" ? "```" : "~~~"
      out.push(line)
      continue
    }
    if (fence !== null) {
      out.push(line)
      if (line.trim().startsWith(fence)) fence = null
      continue
    }
    if (line.trim() === "") {
      flush()
      out.push(line)
      continue
    }
    paragraph.push(line)
  }
  flush()

  return out.join("\n")
}
