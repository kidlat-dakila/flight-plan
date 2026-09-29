import type { Hunk } from "../utils/pr/hunks"
import { mainlineCommit, readBlob } from "./blob"
import { hunksBetween } from "./diff"
import type { Report } from "./jobs"
import { fileSymbols, symbolLanguageOf } from "../../lib/codegraph/symbols/declarations"
import type { SymbolSpan } from "../../lib/codegraph/symbols/spans"
import {
  sectionsFrom,
  type ChangedFile,
  type ScaffoldSection,
} from "./walkthroughOf"

/**
 * The whole scaffold, from a commit range to a document's structure.
 *
 * Every piece this composes is tested on its own; what lives here is the order
 * and the degraded states. Three things decide the shape.
 *
 * **Nothing is checked out.** Files are read with `git cat-file`
 * over a commit that is merely fetched, so there is no worktree to create, no
 * dependency directory to link into it, no removal path, and nothing left
 * behind by a crash. This is what the whole change was for: a scaffold that
 * needs no window open, no language server installed and no tree on disk.
 *
 * **Parsing and resolving fail differently, and both have to be reported.** A
 * file no grammar can read gets a section from the diff alone. A file that
 * parses but declares nothing that runs is not a failure at all — a constant, a
 * type, a JSON file — and it gets its section and no node, which is what the
 * diagram following the execution means.
 *
 * **A call that cannot be resolved becomes a question rather than a guess.**
 * The resolver narrows it to whatever it can and the count goes in the notes.
 * Nothing is drawn on a proximity heuristic: the agent may not remove nodes, so
 * an invented one is permanent.
 */

export type ScaffoldResult = {
  sections: ScaffoldSection[]
  /**
   * The changed files treated as tests, which get neither a card nor a node.
   *
   * Named here rather than silently dropped. The format is explicit that a
   * walkthrough tours the change and a test is the evidence the change works —
   * named once in the implementation list, never given a waypoint, never on the
   * board. The scaffold used to break that rule and the fill tools could not
   * repair it: they cannot delete a waypoint or a node.
   *
   * A path is recognised by its name, which is a guess, and that is why the
   * list is reported rather than kept.
   */
  tests: string[]
  /** One line per file nothing could read, for the agent to pass on. */
  notes: string[]
}

export type ScaffoldOptions = {
  root: string
  repo: string
  head: string
  base: string | undefined
  report: Report
  /**
   * The text of one path as the walk reads it, injected in tests.
   *
   * Not shaped around a tree on disk: the scaffold names a repository and a
   * commit, and by default reads the object database (see `readAcross`).
   */
  read?: (path: string) => Promise<string | null>
  /**
   * The mainline commit, for the files this change does not touch.
   *
   * Undefined asks the checkout. Null says there is no mainline, and every file
   * is read on the branch -- which is what a repository with no remote does,
   * and what every test injecting its own `read` already did.
   */
  main?: string | null
  /**
   * The reading order for the walkthrough sections, from the reach.
   *
   * The changed files, deepest change first, computed by {@link buildReach}
   * from the codegraph model. Absent falls back to diff order.
   */
  order?: readonly string[]
  /** Still injectable on its own, for a test that only cares about declarations. */
  symbolsFor?: (path: string) => Promise<readonly SymbolSpan[] | undefined>
  /**
   * The parsed diff, injected in place of reading it from git.
   *
   * Normally the diff is read from the object database with `hunksBetween`. A
   * caller that already has the two versions in hand — a test, or the
   * diff-artifact playground, neither of which is a repository — passes the
   * hunks directly so the walk runs without git.
   */
  hunks?: Record<string, Hunk>
}

export async function buildScaffold(options: ScaffoldOptions): Promise<ScaffoldResult> {
  const { root, head, base, report } = options

  report({ step: "reading the diff" })
  const hunks = options.hunks ?? (await hunksBetween(root, base, head))
  if (hunks === null) {
    throw new Error(
      base === undefined
        ? "This walkthrough has no base commit, so nothing can say which lines changed. Begin it again with `base` set."
        : `The diff between ${base} and ${head} could not be read. Both commits have to be in this checkout; fetch them and try again.`,
    )
  }

  const everything = Object.keys(hunks).sort()
  if (everything.length === 0) throw new Error("That commit range changes no files.")

  /*
   * Tests are set aside before anything else reads the diff.
   *
   * Unless they are all there is. A change that adds only tests has nothing
   * else to tour, and a document with no sections at all is refused at
   * completion — so in that case they are the change, and the tour is of them.
   */
  const tests = everything.filter(looksLikeTest)
  const paths = tests.length === everything.length ? everything : everything.filter((path) => !looksLikeTest(path))
  const setAside = tests.length === everything.length ? [] : tests

  /*
   * The same rule a reference resolves by, one step earlier.
   *
   * A scaffold reading every file on the branch would derive its ranges there
   * and hand the untouched ones to a resolver that checks them on the
   * mainline. Two substrates and one set of numbers is the disagreement this
   * whole design exists to prevent, so the walk reads where the check will.
   */
  const main = options.main !== undefined ? options.main : await mainlineCommit(root)
  const read = options.read ?? readAcross(root, head, main, new Set(Object.keys(hunks)))

  // Per-file declarations only. Reach (who calls what) is the diagram/blast's
  // job and lives in `buildReach` over `src/lib/codegraph`, not here.
  const symbolsFor = options.symbolsFor ?? symbolsOver(read)

  const notes: string[] = []
  const files: ChangedFile[] = []

  if (setAside.length > 0) {
    const listed = setAside.map((path) => `\`${path}\``).join(", ")
    const note =
      `${listed} ${setAside.length === 1 ? "is a test and has" : "are tests and have"} no waypoint ` +
      "and no node: a test is the evidence the change works rather than part of it. Name " +
      `${setAside.length === 1 ? "it" : "them"} once in the implementation list, with no link.`
    notes.push(note)
    report({ note })
  }

  report({ step: "reading declarations", done: 0, total: paths.length })
  for (const [index, path] of paths.entries()) {
    const added = hunks[path]?.added ?? []

    const symbols = await symbolsFor(path)
    if (symbols === undefined) {
      /*
       * No grammar could read it. Ordinary for a language none is shipped for,
       * and ordinary for a file that is not code at all.
       *
       * Said out loud rather than swallowed, and the two are told apart: a
       * scaffold rich for TypeScript and quietly empty for Ruby is worse than
       * no scaffold, because the gap looks like the change having nothing in
       * it. Which of the two it is decides what somebody would do about it.
       */
      const note =
        symbolLanguageOf(path) === null
          ? `no grammar for \`${path}\`; its section is from the diff alone`
          : `\`${path}\` could not be parsed; its section is from the diff alone`
      notes.push(note)
      report({ note })
    }

    /*
     * `created` rides along because a new file is one hunk however long it is,
     * and that is the one place the per-hunk rule bends. See `walkthroughOf`.
     */
    files.push({
      path,
      added,
      symbols,
      ...(hunks[path]?.created === true ? { created: true as const } : {}),
    })
    report({ step: `read ${path}`, done: index + 1 })
  }

  report({ step: "writing the scaffold" })

  /*
   * The order a reader walks the sections in.
   *
   * The reach computes a default — deepest change first, so a name is defined
   * before it is met — and passes it in `order`. Absent (a test that injects no
   * reach), the diff order stands. Either way the agent may change it with
   * `set-reading-order`; this is only the default.
   */
  const order = options.order ?? paths
  const byPath = new Map(files.map((file) => [file.path, file]))
  const ordered: ChangedFile[] = []
  const placed = new Set<string>()
  for (const path of order) {
    const file = byPath.get(path)
    if (file !== undefined && !placed.has(path)) {
      ordered.push(file)
      placed.add(path)
    }
  }
  for (const file of files) {
    if (!placed.has(file.path)) ordered.push(file)
  }

  return { sections: sectionsFrom(ordered), tests: setAside, notes }
}

/** A path that reads as a test, mock, spec, e2e or eval file. */
const TEST_PATH =
  /(^|[\\/])(__tests__|__mocks__|tests?|specs?|e2e|evals?)[\\/]|\.(test|spec|e2e|eval)\.[^./]+$/

function looksLikeTest(path: string): boolean {
  return TEST_PATH.test(path)
}

/**
 * How the walk reads a file: the branch for what the change touches, the
 * mainline for everything else.
 *
 * The same rule a reference resolves by, applied one step earlier. A scaffold
 * that read every file on the branch would derive its line ranges there and
 * hand them to a resolver that checks the untouched ones on the mainline —
 * two substrates, one set of numbers, and the disagreement invisible until a
 * reader opens the card and finds different code. With no mainline, every
 * file is read on the branch.
 */
function readAcross(
  root: string,
  commit: string,
  main: string | null,
  changed: ReadonlySet<string>,
): (file: string) => Promise<string | null> {
  if (main === null) return (file) => readBlob(root, commit, file)
  return async (file) => {
    if (changed.has(file)) return await readBlob(root, commit, file)
    // A file on neither side belongs to the branch: it was added by an earlier
    // commit on it, which is not this change and is not on the mainline either.
    return (await readBlob(root, main, file)) ?? (await readBlob(root, commit, file))
  }
}

/**
 * The declarations of each file, parsed once however often it is asked.
 * Undefined when the file cannot be read or parsed, which is not the same as
 * an empty list; see `declarationsIn`.
 */
function symbolsOver(
  read: (file: string) => Promise<string | null>,
): (file: string) => Promise<readonly SymbolSpan[] | undefined> {
  const held = new Map<string, Promise<readonly SymbolSpan[] | undefined>>()
  return (file) => {
    let answer = held.get(file)
    if (answer === undefined) {
      answer = (async () => {
        const text = await read(file)
        if (text === null) return undefined
        return (await fileSymbols(file, text)) ?? undefined
      })()
      held.set(file, answer)
    }
    return answer
  }
}
