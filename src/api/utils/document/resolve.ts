import { labelIdentifier, linkKey, parseCodeLinks } from "../../../lib/schemas/document/codeLinks"
import type { LineRange } from "../../../lib/schemas/document/primitives"
import type { DocumentInput, Fence, Waypoint } from "../../../lib/schemas/document/schema"
import type {
  Hunk,
  StoredDocument,
  StoredFence,
  StoredFinding,
  StoredWaypoint,
} from "../../../lib/schemas/document/stored"

/**
 * Authored to stored.
 *
 * Every field the repository already knows is answered here, once, against a
 * pinned substrate: a symbol becomes a range, a hunk index becomes marks, a
 * range's first line becomes `expect`, and the diff becomes `sources`.
 *
 * It refuses rather than degrades. A waypoint whose symbol cannot be found or
 * whose hunk index does not exist would render *plausibly wrong* — pointing the
 * reader at real code that is not the code the author meant — and that is the
 * one failure this whole design exists to prevent. The write fails and the
 * agent is told what to write instead.
 */

export type ResolveFinding = {
  severity: "error" | "warning"
  /** Path into the authored document, for example `…waypoints[0].code`. */
  at: string
  message: string
}

export type ResolveSource = {
  /** The commit the files are read at, or null for a working tree. */
  at: string | null
  readFile: (path: string) => Promise<string | null>
  /** What the change did to each file, keyed by path. */
  hunks: Record<string, Hunk>
  /**
   * The mainline, for files the change does not touch.
   *
   * One lookup rule answers every reference: a path in the diff is read on the
   * branch, because the branch is what the document is about; anything else is
   * read on `origin/main`, because that is the version a reader has. A branch
   * that forked a month ago is not where anybody should be sent to read code
   * the change never touched.
   *
   * Absent for a plan, which has no diff and resolves against one substrate
   * throughout.
   */
  main?: { at: string; readFile: (path: string) => Promise<string | null> } | null
  /**
   * Where a symbol lives in a file's text, or null when nothing can answer.
   *
   * Given the text this resolver read, never left to read the file itself: a
   * file the change does not touch is read on the mainline, and a lookup that
   * parsed it at the branch instead would return a range from one version for
   * text, `expect` and `sources[path].at` from the other. The card then
   * highlights the wrong lines with no error.
   *
   * Injected so resolution needs no parser of its own; null is an ordinary
   * state, and the message it produces names the fallback.
   */
  findSymbol: ((path: string, symbol: string, text: string) => Promise<LineRange | null>) | null
}

export type Resolution =
  | { ok: true; document: StoredDocument; findings: ResolveFinding[] }
  | { ok: false; findings: ResolveFinding[] }

/**
 * The text to record as an anchor, or undefined when there is none worth having.
 *
 * A blank line is not an anchor. `repairRange` searches the file for this text
 * and calls the range `lost` when it matches nothing or matches more than once
 * — and a blank line matches every blank line in the file, so recording one
 * would guarantee the worse of those two answers on every future read. Leaving
 * it out says the same thing honestly and costs nothing: the range is simply
 * unrepaired, which is where it started.
 */
function anchorAt(lines: readonly string[], line: number): string | undefined {
  const text = lines[line - 1]
  return text === undefined || text.trim() === "" ? undefined : text
}

/** How a substrate is named in a message: a commit, or the working tree. */
function whereNamed(at: string | null): string {
  return at === null ? "the working tree" : at
}

/**
 * A path that was cut short by Markdown rather than typed wrongly.
 *
 * A bare link destination ends at the first `)`, so `app/(checkout)/x.tsx`
 * arrives here as `app/(checkout` — a path with a bracket nothing closes.
 * That shape is the signature of the truncation and not of a real path, so it
 * is safe to read as one.
 */
function looksTruncated(path: string): boolean {
  const opens = (pair: string): boolean => {
    let depth = 0
    for (const char of path) {
      if (char === pair[0]) depth += 1
      else if (char === pair[1]) depth -= 1
    }
    return depth > 0
  }
  return opens("()") || opens("[]")
}

/**
 * What to say when a link names a file that is not there.
 *
 * Two different failures wore one message. A mistyped path is what "check the
 * path" is for; a path Markdown truncated is a syntax problem, and sending its
 * author to look at the path sends them to look at the one part that was
 * right. A route group or a dynamic segment puts brackets in a path, so the
 * second failure gets the answer rather than the shrug.
 */
function unresolvedLink(target: string, path: string, where: string): string {
  const named = `the link \`${target}\` names \`${path}\`, which does not exist at ${where}.`
  if (!looksTruncated(path)) return `${named} Check the path.`
  return (
    `${named} The path looks cut short: a bare link destination ends at the ` +
    `first \`)\`, so a path containing \`(\`, \`)\`, \`[\` or \`]\` has to go in ` +
    `pointy brackets — \`[label](<code:${path}…#L1-2>)\`. Percent-escaping the ` +
    `brackets works too; backslashes do not.`
  )
}

/** Splits file text into lines, without the phantom line a trailing newline adds. */
function fileLines(text: string): string[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n")
  if (lines.length > 1 && lines[lines.length - 1] === "") lines.pop()
  return lines
}

export async function resolve(
  input: DocumentInput,
  source: ResolveSource,
): Promise<Resolution> {
  const findings: ResolveFinding[] = []
  /*
   * Each file read once, and remembered even when it was missing.
   *
   * A walkthrough usually visits one file across several waypoints, and against
   * a remote checkout reading it per waypoint is slow enough to notice. The
   * key set is also what `sources` is built from at the end.
   */
  const contents = new Map<string, string[] | null>()
  /** The text each path was read as, for the symbol lookup. */
  const readText = new Map<string, string>()
  /** The commit each path was actually read at, which `sources` is built from. */
  const readAt = new Map<string, string | null>()

  const linesOf = async (path: string): Promise<string[] | null> => {
    if (contents.has(path)) return contents.get(path) ?? null

    const main = source.main
    const onMain = main != null && source.hunks[path] === undefined
    const text = onMain ? await main.readFile(path) : await source.readFile(path)

    /*
     * A path on neither side is a file the branch itself added earlier.
     *
     * It is in no hunk of *this* change and not on the mainline either, which
     * happens on a stacked branch and on the second pull request of a series.
     * Refusing would make those unwritable, so it falls back to the branch and
     * says so: the reference resolves, and the reader is told which version it
     * was checked against.
     */
    if (onMain && text === null) {
      const branch = await source.readFile(path)
      if (branch !== null) {
        findings.push({
          severity: "warning",
          at: `sources.${path}`,
          message: `\`${path}\` is not on origin/main, so it was read at ${whereNamed(source.at)} instead. It is a file this branch added rather than one the change touches.`,
        })
        const lines = fileLines(branch)
        contents.set(path, lines)
        readText.set(path, branch)
        readAt.set(path, source.at)
        return lines
      }
    }

    const lines = text === null ? null : fileLines(text)
    contents.set(path, lines)
    if (text !== null) readText.set(path, text)
    readAt.set(path, onMain && text !== null ? main.at : source.at)
    return lines
  }

  /** Where a path was read, for the messages to name. */
  const whereOf = (path: string): string => whereNamed(readAt.get(path) ?? source.at)

  const fail = (at: string, message: string): null => {
    findings.push({ severity: "error", at, message })
    return null
  }

  const resolveFence = async (code: Fence, at: string): Promise<StoredFence | null> => {
    const lines = await linesOf(code.path)
    /*
     * A new file is the one fence whose path is meant to be missing.
     *
     * Its body is all of the file, so there is no position to check and no
     * line to anchor on. Refusing it for not existing refused the only thing a
     * `new` proposal can say.
     */
    if (code.kind === "proposal" && code.position.kind === "new") {
      return { ...code, expect: undefined }
    }
    if (lines === null) {
      return fail(
        `${at}.path`,
        `\`${code.path}\` does not exist at ${whereOf(code.path)}. Check the path.`,
      )
    }

    if (code.kind === "proposal") {
      /*
       * A position is checked against the file the way a range is, and then
       * some. A wrong range shows the reader the wrong lines; a wrong position
       * tells them to write new code in the wrong place, and they will.
       */
      const line =
        code.position.kind === "after" || code.position.kind === "before"
          ? code.position.line
          : code.position.kind === "replace"
            ? code.position.lines.from
            : null
      if (line !== null && line > lines.length) {
        return fail(
          `${at}.position`,
          `line ${String(line)} is past the end of \`${code.path}\`, which has ${String(lines.length)} lines at ${whereOf(code.path)}.`,
        )
      }
      return { ...code, expect: line === null ? undefined : anchorAt(lines, line) }
    }

    let focus: LineRange
    if ("symbol" in code.target) {
      if (source.findSymbol === null) {
        return fail(
          `${at}.target`,
          `symbols cannot be resolved here, so \`${code.target.symbol}\` cannot be looked up. Give \`{ "focus": [from, to] }\` instead, using the line numbers as the file has them at ${whereOf(code.path)}.`,
        )
      }
      const found = await source.findSymbol(code.path, code.target.symbol, readText.get(code.path) ?? "")
      if (found === null) {
        return fail(
          `${at}.target`,
          `no symbol \`${code.target.symbol}\` in \`${code.path}\`. Check the name, or give \`{ "focus": [from, to] }\` if it is not a declaration.`,
        )
      }
      focus = found
    } else {
      focus = code.target.focus
      if (focus.to > lines.length) {
        return fail(
          `${at}.target`,
          `focus ends at line ${String(focus.to)}, past the end of \`${code.path}\`, which has ${String(lines.length)} lines at ${whereOf(code.path)}.`,
        )
      }
    }

    const added = source.hunks[code.path]?.added ?? []
    let marks: LineRange[] | undefined
    if (code.covers !== undefined) {
      const picked: LineRange[] = []
      for (const index of code.covers) {
        const hunk = added[index]
        if (hunk === undefined) {
          return fail(
            `${at}.covers`,
            `\`${code.path}\` has ${String(added.length)} hunk${added.length === 1 ? "" : "s"} in this change, so index ${String(index)} names nothing. Indices count from 0, in file order.`,
          )
        }
        /*
         * Clipped to the focus, because a mark says which lines of the range the
         * waypoint is about. A hunk can be far wider than the range: a new
         * file's one hunk is the whole file, and unclipped it marked every line
         * for every waypoint in that file. A hunk wholly outside the focus is
         * kept as it is; clipping it would leave no mark at all.
         */
        const overlaps = hunk.from <= focus.to && hunk.to >= focus.from
        picked.push(
          overlaps
            ? { from: Math.max(hunk.from, focus.from), to: Math.min(hunk.to, focus.to) }
            : hunk,
        )
      }
      marks = picked
    }

    return { ...code, focus, marks, expect: anchorAt(lines, focus.from) }
  }

  const resolveWaypoints = async (
    points: readonly Waypoint[],
    at: string,
  ): Promise<StoredWaypoint[] | null> => {
    const out: StoredWaypoint[] = []
    for (const [index, point] of points.entries()) {
      const here = `${at}[${String(index)}]`
      let code: StoredFence | null = null
      if (point.code !== null) {
        code = await resolveFence(point.code, `${here}.code`)
        if (code === null) return null
      }
      let children: StoredWaypoint[] | undefined
      if (point.children !== undefined) {
        const kids = await resolveWaypoints(point.children, `${here}.children`)
        if (kids === null) return null
        children = kids
      }
      out.push({ ...point, code, children })
    }
    return out
  }

  /*
   * Every `code:` link in the prose, checked like the reference it is.
   *
   * These carry most of the weight now: the Overview and the implementation
   * list name the code they are about with a link rather than describing it,
   * which is what stops "the guard now checks the whole basket" from being a
   * sentence nobody can verify. A link that resolves is a claim the repository
   * has agreed to.
   *
   * Checked rather than resolved, because a link in the middle of a sentence
   * does not become anything — the renderer looks the target up when the reader
   * hovers it. What it must not be is wrong.
   */
  const checkLinks = async (markdown: string, at: string): Promise<boolean> => {
    for (const link of parseCodeLinks(markdown)) {
      /*
       * Decoded, because a destination is a URL and an author who hit the
       * bracket problem reaches for percent-encoding next. `%28page%29` is the
       * same file as `(page)`, and treating it literally answers a reasonable
       * attempt with a file that does not exist.
       */
      const path = linkKey(link.path)
      const lines = await linesOf(path)
      if (lines === null) {
        fail(at, unresolvedLink(link.target, path, whereOf(path)))
        return false
      }

      let range: LineRange | null = null
      /*
       * A link is a path and lines, and nothing else.
       *
       * The symbol form went when the lookup rule did: a reference resolves in
       * the diff first and on the mainline otherwise, and a name resolved by a
       * language server has no version to belong to. Refused rather than
       * quietly looked up, because a document written the old way would
       * otherwise store ranges from a substrate nobody chose.
       */
      if (link.symbol !== null) {
        fail(
          at,
          `the link \`${link.target}\` names a symbol. A link is a path and lines: write \`code:${path}#L<from>-<to>\`, using the line numbers as the file has them at ${whereOf(path)}.`,
        )
        return false
      }
      if (link.lines !== null) {
        if (link.lines.to > lines.length) {
          fail(
            at,
            `the link \`${link.target}\` ends at line ${String(link.lines.to)}, past the end of \`${path}\`, which has ${String(lines.length)} lines at ${whereOf(path)}.`,
          )
          return false
        }
        range = link.lines
      }

      /*
       * A backticked label has to still be in the range it points at.
       *
       * This is what makes a line number written into a sentence safe: the
       * label is the anchor. A label in plain prose anchors on nothing, which
       * is right for the one place that happens — the first step of a trigger
       * trace names a user action, and "Submit" is not a symbol to look for.
       */
      const identifier = labelIdentifier(link.label)
      if (identifier === null || range === null) continue
      const within = lines.slice(range.from - 1, range.to).join("\n")
      if (within.includes(identifier)) continue
      findings.push({
        severity: "warning",
        at,
        message: `the link \`${link.target}\` is labelled \`${identifier}\`, which is not in the lines it points at. The range has probably moved.`,
      })
    }
    return true
  }

  const texts: { markdown: string; at: string }[] = [
    { markdown: input.contextBody.context, at: "contextBody.context" },
  ]
  if (input.codeWalkthrough.note !== undefined) {
    texts.push({ markdown: input.codeWalkthrough.note, at: "codeWalkthrough.note" })
  }
  input.contextBody.overview?.forEach((one, index) => {
    texts.push(
      { markdown: one.when, at: `contextBody.overview[${String(index)}].when` },
      { markdown: one.then, at: `contextBody.overview[${String(index)}].then` },
    )
  })
  input.contextBody.implementation?.forEach((group, gi) => {
    group.items.forEach((item, ii) => {
      texts.push({
        markdown: item.text,
        at: `contextBody.implementation[${String(gi)}].items[${String(ii)}].text`,
      })
    })
  })
  input.codeWalkthrough.files.forEach((file, fi) => {
    file.summary.forEach((line, si) => {
      texts.push({
        markdown: line,
        at: `codeWalkthrough.files[${String(fi)}].summary[${String(si)}]`,
      })
    })
    const readings = (points: readonly Waypoint[], at: string): void => {
      points.forEach((point, index) => {
        // A reading nobody wrote has no links to verify.
        if (point.reading !== null) {
          texts.push({
            markdown: point.reading,
            at: `${at}[${String(index)}].reading`,
          })
        }
        if (point.children !== undefined) {
          readings(point.children, `${at}[${String(index)}].children`)
        }
      })
    }
    readings(file.waypoints, `codeWalkthrough.files[${String(fi)}].waypoints`)
  })
  /*
   * The blast radius is prose too, and the same rule applies to it.
   *
   * A contract that names the thing whose surface moved, and an effect that
   * names what crosses, are exactly the sentences a `code:` link exists for: a
   * reviewer should be able to go and look rather than take the word for it.
   * Read structurally rather than through `checkBlast`, the way every other
   * diagram check here reads a diagram, because collecting strings needs no
   * schema.
   */
  const board = input.blast as { nodes?: unknown } | null | undefined
  if (board !== null && board !== undefined && Array.isArray(board.nodes)) {
    for (const [index, raw] of board.nodes.entries()) {
      if (typeof raw !== "object" || raw === null) continue
      const node = raw as {
        contract?: { before?: unknown; now?: unknown }
        effect?: unknown
      }
      const at = `blast.nodes[${String(index)}]`
      if (typeof node.contract?.before === "string") {
        texts.push({ markdown: node.contract.before, at: `${at}.contract.before` })
      }
      if (typeof node.contract?.now === "string") {
        texts.push({ markdown: node.contract.now, at: `${at}.contract.now` })
      }
      if (typeof node.effect === "string") {
        texts.push({ markdown: node.effect, at: `${at}.effect` })
      }
    }
  }
  ;(input.findings ?? []).forEach((found, index) => {
    texts.push({ markdown: found.reading, at: `findings[${String(index)}].reading` })
    found.trace?.forEach((step, si) => {
      texts.push({ markdown: step, at: `findings[${String(index)}].trace[${String(si)}]` })
    })
  })

  for (const { markdown, at } of texts) {
    if (!(await checkLinks(markdown, at))) return { ok: false, findings }
  }

  const files: StoredDocument["codeWalkthrough"]["files"] = []
  for (const [index, file] of input.codeWalkthrough.files.entries()) {
    const waypoints = await resolveWaypoints(
      file.waypoints,
      `codeWalkthrough.files[${String(index)}].waypoints`,
    )
    if (waypoints === null) return { ok: false, findings }
    files.push({ ...file, waypoints })
  }

  const resolved: StoredFinding[] = []
  for (const [index, found] of (input.findings ?? []).entries()) {
    const here = `findings[${String(index)}]`
    let code: StoredFence | null = null
    if (found.code !== null) {
      code = await resolveFence(found.code, `${here}.code`)
      if (code === null) return { ok: false, findings }
    }
    resolved.push({ ...found, code })
  }

  /*
   * One entry per file that was read, which is one per file a fence names.
   *
   * Built from the read cache rather than by walking the tree a second time:
   * the cache is already exactly that set, and a second traversal would be a
   * second chance to disagree with the first.
   */
  const sources: StoredDocument["sources"] = {}
  for (const path of contents.keys()) {
    sources[path] = { at: readAt.get(path) ?? source.at, hunks: source.hunks[path] }
  }

  return {
    ok: true,
    findings,
    document: {
      ...input,
      codeWalkthrough: { ...input.codeWalkthrough, files },
      findings: resolved.length === 0 ? undefined : resolved,
      sources,
    } as StoredDocument,
  }
}
