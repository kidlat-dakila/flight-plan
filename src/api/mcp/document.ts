import { checkComplete } from "../utils/document/complete"
import { checkDocument } from "../utils/document/check"
import { resolve, type ResolveFinding } from "../utils/document/resolve"
import { documentInput, type DocumentInput } from "../../lib/schemas/document/schema"
import { mainlineCommit, readBlob } from "./blob"
import { hunksBetween } from "./diff"
import { fileSymbols } from "../../lib/codegraph/symbols/declarations"
import { findIn, type SymbolSpan } from "../../lib/codegraph/symbols/spans"
import type { Hunk } from "../utils/pr/hunks"
import type { Kind, Repository } from "./repository"

/**
 * The JSON write path.
 *
 * An agent hands over what it observed; this answers everything the repository
 * already knows and stores the result. Nothing here asks the agent to be right
 * about a line number, a diff, or the text on the first line of a range.
 *
 * It refuses rather than degrades, and that is the whole point of doing the
 * work at the write. A document whose range has drifted renders *plausibly*
 * wrong — real code, at the wrong place, with nothing to suggest anything is
 * amiss — and a reader has no way to tell. Refusing costs the agent one more
 * turn, which it is in the middle of anyway.
 */

export type WriteOutcome =
  | {
      ok: true
      /** The resolved document, ready to store. */
      stored: string
      /** Anything worth saying that did not refuse the write. */
      warnings: string
    }
  | { ok: false; message: string }

export type WriteOptions = {
  /**
   * Where symbols come from. Defaults to asking the extension.
   *
   * Injectable so a test can say "nothing answers" without waiting for the
   * channel to time out, and so resolution can be driven from somewhere other
   * than a running extension.
   */
  findSymbol?:
    | ((path: string, symbol: string, text: string) => Promise<{ from: number; to: number } | null>)
    | null
  /**
   * The mainline substrate, for files the change does not touch.
   *
   * Injectable for the same reason `findSymbol` is: a test says what the
   * mainline holds without a checkout, and resolution can be driven from
   * somewhere other than a repository on disk. Undefined means "work it out
   * from the checkout"; null means there is none, and everything resolves on
   * the branch.
   */
  main?: { at: string; readFile: (path: string) => Promise<string | null> } | null
}

function say(kind: Kind): string {
  return kind === "plan" ? "plan" : "walkthrough"
}

/** Findings as the agent reads them: the path, then what is wrong with it. */
function format(findings: readonly ResolveFinding[]): string {
  return findings.map((f) => `${f.at}: ${f.message}`).join("\n")
}

/**
 * Where the document's files are read, and what the change did to them.
 *
 * The commit comes from the document itself for a walkthrough, and a plan has
 * none — its positions resolve against the working tree, because it is about
 * code the reader is going to write.
 */
async function hunksFor(
  input: DocumentInput,
  root: string | null,
): Promise<{ hunks: Record<string, Hunk>; note: string }> {
  if (input.meta.kind !== "walkthrough") return { hunks: {}, note: "" }
  if (root === null) {
    return {
      hunks: {},
      note: "\n\nNo marks were computed: no VS Code window has this repository open, so there was no checkout to diff. The document is stored and reads correctly; the changed lines simply are not highlighted.",
    }
  }
  if (input.meta.base === undefined) {
    return {
      hunks: {},
      note: "\n\nNo marks were computed: the document has no `base`, so there is nothing to compare `head` against. Add the commit the branch forked from.",
    }
  }

  const found = await hunksBetween(root, input.meta.base, input.meta.head)
  if (found === null) {
    return {
      hunks: {},
      note: `\n\nNo marks were computed: git could not diff ${input.meta.base.slice(0, 8)}...${input.meta.head.slice(0, 8)} in this checkout. Fetch both commits and update the document to have them highlighted.`,
    }
  }
  return { hunks: found, note: "" }
}

/** The mainline commit and a reader for it, or null when there is no mainline. */
async function mainlineFor(
  root: string,
): Promise<{ at: string; readFile: (path: string) => Promise<string | null> } | null> {
  const at = await mainlineCommit(root)
  if (at === null) return null
  return { at, readFile: (path: string) => readBlob(root, at, path) }
}

export async function writeDocument(
  body: string,
  kind: Kind,
  /** The checkout, when a window has one open. Null disables the file checks. */
  tree: Repository | null,
  /** The checkout's path, for the diff. */
  root: string | null,
  options: WriteOptions = {},
): Promise<WriteOutcome> {
  let raw: unknown
  try {
    raw = JSON.parse(body)
  } catch (cause) {
    return {
      ok: false,
      message: `This ${say(kind)} is not valid JSON, so nothing was stored: ${String(cause)}`,
    }
  }

  const parsed = documentInput.safeParse(raw)
  if (!parsed.success) {
    const issues = parsed.error.issues
      .slice(0, 12)
      .map((issue) => `${issue.path.join(".") || "(document)"}: ${issue.message}`)
      .join("\n")
    return {
      ok: false,
      message: `This ${say(kind)} does not match the document schema, so nothing was stored:\n\n${issues}\n\nFix these and submit again.`,
    }
  }

  if (parsed.data.meta.kind !== kind) {
    return {
      ok: false,
      message: `This tool stores a ${say(kind)}, but \`meta.kind\` says "${parsed.data.meta.kind}". They have to agree.`,
    }
  }

  const { hunks, note } = await hunksFor(parsed.data, root)

  /*
   * No checkout means no file to resolve against.
   *
   * Refused rather than stored unresolved. A stored document must carry a
   * range for every fence —
   * the renderer has no way to draw an unresolved one — so there is no
   * half-resolved document to fall back to. Saying why is the useful part.
   */
  if (tree === null) {
    return {
      ok: false,
      message: `This ${say(kind)} was not stored: no VS Code window has this repository open at the right commit, so its references could not be resolved against any code. Open the repository and submit again.`,
    }
  }

  /*
   * Where a reference outside the change is read.
   *
   * A walkthrough only: a plan resolves against the working tree it splices
   * into, so it has no second substrate to choose between.
   */
  const main =
    options.main !== undefined
      ? options.main
      : kind === "walkthrough" && root !== null
        ? await mainlineFor(root)
        : null

  const resolution = await resolve(parsed.data, {
    at: kind === "plan" ? null : tree.head,
    readFile: tree.readFile,
    hunks,
    main,
    /*
     * Parsed rather than asked, and the difference is the whole point.
     *
     * This was a question for the extension, which is where the language
     * servers are — and it was the reason the answer channel existed. One parse
     * per file however many waypoints point into it, and a file no grammar can
     * read is refused with a message naming the fallback, which is the path a
     * language with no grammar takes for good.
     */
    // The text is read by `resolve`, so the lookup needs no checkout of its own.
    findSymbol: options.findSymbol !== undefined ? options.findSymbol : symbolsInText(),
  })

  if (!resolution.ok) {
    return {
      ok: false,
      message: `This ${say(kind)} was not stored, because it would not read correctly:\n\n${format(resolution.findings)}\n\nFix these and submit again.`,
    }
  }

  const problems = checkDocument(resolution.document)
  const refusing = problems.filter((p) => p.severity === "error")
  if (refusing.length > 0) {
    return {
      ok: false,
      message: `This ${say(kind)} was not stored, because it would not read correctly:\n\n${format(refusing)}\n\nFix these and submit again.`,
    }
  }

  /*
   * The rules only a finished document has to pass.
   *
   * **The document's own status decides.** One that says it is complete is
   * held to every rule; one that says it is still being written is not, because
   * it breaks all of them by definition -- no waypoints yet, no overview, no
   * diagram. That also means a whole-body write is checked exactly as it always
   * was, since a document that does not mention its status is complete.
   */
  const missing =
    resolution.document.meta.status === "complete"
      ? checkComplete(resolution.document)
      : []
  const blocking = missing.filter((p) => p.severity === "error")
  if (blocking.length > 0) {
    return {
      ok: false,
      message: `This ${say(kind)} is not finished, so it was not marked complete:\n\n${format(blocking)}\n\nAdd what is missing and mark it complete again. What is already stored is untouched, and a reader can still see it.`,
    }
  }

  const rest = [...resolution.findings, ...problems, ...missing]
  return {
    ok: true,
    stored: JSON.stringify(resolution.document, null, 2),
    warnings: (rest.length === 0 ? "" : `\n\n${format(rest)}`) + note,
  }
}

/**
 * Where a named declaration lives, for resolving a document's references.
 *
 * The other consumer of declarations, and the older one: an author writes
 * `{ symbol: "priceOf" }` and the reference is resolved to a line range when
 * the document is stored. That used to be a question for the extension, which
 * is why the answer channel existed at all.
 *
 * The rules it has to keep are `findIn`'s, unchanged: a suffix match, so
 * `hasStock` finds `StockService.hasStock` when there is only one, and a
 * refusal when there are two. Resolving an ambiguous name to the first match is
 * right half the time and silently wrong the rest.
 *
 * It parses the text `resolve` read, and reads nothing itself. It used to read
 * every file at the document's head, while `resolve` reads a file the change
 * does not touch on the mainline, so the range and the text could come from
 * two versions of the file.
 */
function symbolsInText(): (
  path: string,
  symbol: string,
  text: string,
) => Promise<{ from: number; to: number } | null> {
  // One parse per file, however many references point into it. `resolve`
  // reads each path once, so a path always comes with the same text.
  const byPath = new Map<string, Promise<readonly SymbolSpan[] | null>>()

  return async (file, symbol, text) => {
    let held = byPath.get(file)
    if (held === undefined) {
      held = fileSymbols(file, text)
      byPath.set(file, held)
    }

    const declarations = await held
    if (declarations === null) return null
    const found = findIn(declarations, symbol)
    return found === null || found === "ambiguous" ? null : found
  }
}
