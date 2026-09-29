/**
 * Loading the tree-sitter grammars and parsing, without an editor or the
 * extension.
 *
 * The one tree-sitter loader, for Python: its code graph, execution steps and
 * symbols parse through here (one `Parser.init`, one grammar cache). Bytes in,
 * a tree out — no repository, no commit, no checkout, nothing read from disk
 * except the grammar `.wasm`s. TypeScript and JavaScript are read with acorn
 * (`typescript/estree.ts`).
 */
import * as fsp from "node:fs/promises"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { Language, Parser, type Tree } from "web-tree-sitter"
import { count } from "../walkStats"

/** The languages a grammar is shipped for. */
export type LanguageId = "python"

/** Which grammar reads which extension. */
const BY_EXTENSION: Record<string, LanguageId> = {
  ".py": "python",
  ".pyi": "python",
}

/** The grammar for a path, or null when nothing here can read it. */
export function languageOf(file: string): LanguageId | null {
  return BY_EXTENSION[path.extname(file).toLowerCase()] ?? null
}

/** Every extension a grammar is shipped for, for narrowing a search. */
export function readableExtensions(): string[] {
  return Object.keys(BY_EXTENSION)
}

/**
 * Where the `.wasm` files are, tried in order.
 *
 * Resolved from `import.meta.url` rather than `process.cwd()`, which is whatever
 * the host happened to have. The server runs from three places, so `here` is
 * one of three directories and each gets a candidate:
 *   - **bundled + installed** — a single `mcp-server.mjs` with a `tree-sitter`
 *     directory copied beside it (`here/tree-sitter`);
 *   - **bundled, not installed** — `dist/mcp-server.mjs`, so the repository's
 *     `resources/tree-sitter` is one level up (`here/../resources`);
 *   - **from source** (tests, ts-node) — `src/lib/codegraph/tracer/`, four
 *     levels below the repository root (`here/../../../../resources`).
 * esbuild rewrites `import.meta.url` to the bundle, so a bundled build always
 * sees `here` as `dist/`; the source-relative path only matters unbundled.
 */
function homes(): string[] {
  const here = path.dirname(fileURLToPath(import.meta.url))
  return [
    path.join(here, "tree-sitter"),
    path.join(here, "..", "resources", "tree-sitter"),
    path.join(here, "..", "..", "..", "..", "resources", "tree-sitter"),
  ]
}

/** Reads one `.wasm` from the first home that has it. */
async function wasm(name: string): Promise<Uint8Array | null> {
  for (const home of homes()) {
    try {
      return new Uint8Array(await fsp.readFile(path.join(home, name)))
    } catch {
      // The next home, or none of them.
    }
  }
  return null
}

/**
 * The runtime, started once.
 *
 * The promise is cached rather than the result: two callers arriving together
 * must not start two runtimes, and `init` is not re-entrant.
 */
let started: Promise<boolean> | null = null

function start(): Promise<boolean> {
  started ??= (async () => {
    const runtime = await wasm("web-tree-sitter.wasm")
    if (runtime === null) return false
    await Parser.init({ wasmBinary: runtime })
    return true
  })()
  return started
}

/** One grammar, loaded once. A missing `.wasm` is cached as firmly as a hit. */
const grammars = new Map<LanguageId, Promise<Language | null>>()

function grammarFor(id: LanguageId): Promise<Language | null> {
  let held = grammars.get(id)
  if (held === undefined) {
    held = (async () => {
      if (!(await start())) return null
      const bytes = await wasm(`tree-sitter-${id}.wasm`)
      if (bytes === null) return null
      try {
        return await Language.load(bytes)
      } catch {
        return null
      }
    })()
    grammars.set(id, held)
  }
  return held
}

/**
 * The parse tree for one file's bytes, or null when nothing can read it.
 *
 * A root `ERROR` node means the grammar never got a foothold — the file is
 * reported unreadable rather than as one that declares nothing.
 */
export async function parseSource(file: string, text: string): Promise<Tree | null> {
  if (aborted !== null) return null
  const id = languageOf(file)
  if (id === null) return null
  const language = await grammarFor(id)
  if (language === null) return null

  let tree: Tree | null
  const began = performance.now()
  try {
    tree = parserFor(id, language).parse(text)
  } catch (cause) {
    noteAbort(cause)
    return null
  } finally {
    count("parseMs", performance.now() - began)
  }
  if (tree === null) return null
  count("parses")
  count("parsedChars", text.length)
  if (tree.rootNode.type === "ERROR") {
    tree.delete()
    count("treesFreed")
    return null
  }
  return tree
}

/**
 * One parser per language, reused for every parse.
 *
 * A parser lives in the WebAssembly heap, which JavaScript's collector cannot
 * see: a parser per parse was freed only when a collection happened to run,
 * and a walk over a large repository parsed thousands of files faster than
 * that. The heap grew until the runtime aborted (`RuntimeError: Aborted()`),
 * and an aborted runtime stays dead for the life of the process. `parse` is
 * synchronous, so one parser per language is never used by two callers at once.
 */
const parsers = new Map<LanguageId, Parser>()

function parserFor(id: LanguageId, language: Language): Parser {
  let parser = parsers.get(id)
  if (parser === undefined) {
    parser = new Parser()
    parser.setLanguage(language)
    parsers.set(id, parser)
  }
  return parser
}

/**
 * Why the runtime is dead, once it is; null while it works.
 *
 * After an abort every parse would abort again, so every later one answers
 * "nothing can read it" at once instead. Only a new process parses again.
 */
let aborted: string | null = null

function noteAbort(cause: unknown): void {
  const message = cause instanceof Error ? cause.message : String(cause)
  if (/Aborted\(\)/.test(message)) aborted = message
}

/** Why the parser runtime stopped, or null while it works. */
export function parserAborted(): string | null {
  return aborted
}

/**
 * Runs `read` on the tree of one file and frees the tree after, whatever
 * `read` returns. For the callers that read a tree once; `read` must not keep
 * a node, because a node is a pointer into the tree.
 */
export async function withTree<T>(file: string, text: string, read: (tree: Tree) => T, otherwise: T): Promise<T> {
  const tree = await parseSource(file, text)
  if (tree === null) return otherwise
  try {
    return read(tree)
  } finally {
    tree.delete()
    count("treesFreed")
  }
}

/** Parsed trees by file, shared by everything that reads one walk's files. */
export type TreeCache = {
  /** The tree for a file, read with `read` and parsed once; null when unreadable. */
  treeOf: (file: string, read: (file: string) => Promise<string | null>) => Promise<Tree | null>
  /** Frees every tree. Call only once nothing holds a node of one. */
  free: () => Promise<void>
}

/**
 * One parse per file for a whole walk.
 *
 * Each root of a walk used to build its own resolvers, each with its own
 * cache, so a file the roots shared was read and parsed once per root, and
 * every copy stayed in the WebAssembly heap until the collector ran. One
 * cache for the walk parses each file once, and {@link TreeCache.free} gives
 * the heap back when the walk is over.
 */
export function treeCache(): TreeCache {
  const trees = new Map<string, Promise<Tree | null>>()
  return {
    treeOf: (file, read) => {
      let held = trees.get(file)
      if (held === undefined) {
        held = (async () => {
          const text = await read(file)
          return text === null ? null : parseSource(file, text)
        })()
        trees.set(file, held)
      }
      return held
    },
    free: async () => {
      const held = [...trees.values()]
      trees.clear()
      for (const tree of await Promise.all(held)) {
        if (tree === null) continue
        tree.delete()
        count("treesFreed")
      }
    },
  }
}

/** Clears every cached grammar. Tests only. */
export function forget(): void {
  grammars.clear()
  for (const parser of parsers.values()) parser.delete()
  parsers.clear()
}
