import * as fsp from "node:fs/promises"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { Language, Parser, Query, type Tree } from "web-tree-sitter"
import { Memo, once } from "@/core/memo"
import { count } from "@/core/walk-stats"

export type LanguageId = "python" | "typescript" | "tsx"

const BY_EXTENSION: Record<string, LanguageId> = {
  ".py": "python",
  ".pyi": "python",
}

export function languageOf(file: string): LanguageId | null {
  return BY_EXTENSION[path.extname(file).toLowerCase()] ?? null
}

export function readableExtensions(): string[] {
  return Object.keys(BY_EXTENSION)
}

function homes(): string[] {
  const here = path.dirname(fileURLToPath(import.meta.url))
  return [
    path.join(here, "tree-sitter"),
    path.join(here, "..", "..", "..", "tree-sitter"),
  ]
}

async function readFirst(directories: readonly string[], name: string, from = 0): Promise<Uint8Array | null> {
  if (from >= directories.length) return null
  const bytes = await fsp.readFile(path.join(directories[from], name)).catch(() => null)
  return bytes === null ? readFirst(directories, name, from + 1) : new Uint8Array(bytes)
}

async function wasm(name: string): Promise<Uint8Array | null> {
  return readFirst(homes(), name)
}

class ParserRuntime {
  private abortMessage: string | null = null
  private readonly grammars = new Memo<LanguageId, Promise<Language | null>>()
  private readonly parsers = new Memo<LanguageId, Parser>()
  private readonly queries = new Memo<string, Query>()

  private readonly start = once(async (): Promise<boolean> => {
    const runtime = await wasm("web-tree-sitter.wasm")
    if (runtime === null) return false
    await Parser.init({ wasmBinary: runtime })
    return true
  })

  public readonly aborted = (): string | null => this.abortMessage

  public readonly noteAbort = (cause: unknown): void => {
    const message = cause instanceof Error ? cause.message : String(cause)
    if (message.includes("Aborted()")) this.abortMessage = message
  }

  public readonly grammarFor = async (id: LanguageId): Promise<Language | null> =>
    this.grammars.remember(id, async () => {
      if (!(await this.start())) return null
      const bytes = await wasm(`tree-sitter-${id}.wasm`)
      return bytes === null ? null : Language.load(bytes).catch(() => null)
    })

  public readonly parserFor = (id: LanguageId, language: Language): Parser =>
    this.parsers.remember(id, () => {
      const parser = new Parser()
      parser.setLanguage(language)
      return parser
    })

  public readonly queryFor = (id: LanguageId, language: Language, pattern: string): Query =>
    this.queries.remember(`${id}\n${pattern}`, () => new Query(language, pattern))

  public readonly forget = (): void => {
    this.grammars.clear()
    this.queries.values().forEach((query) => {
      query.delete()
    })
    this.queries.clear()
    this.parsers.values().forEach((parser) => {
      parser.delete()
    })
    this.parsers.clear()
  }
}

const runtime = new ParserRuntime()

function parseWith(parser: Parser, text: string): Tree | null {
  const began = performance.now()
  try {
    return parser.parse(text)
  } catch (cause) {
    runtime.noteAbort(cause)
    return null
  } finally {
    count("parseMs", performance.now() - began)
  }
}

function parseIn(id: LanguageId, language: Language, text: string): Tree | null {
  const tree = parseWith(runtime.parserFor(id, language), text)
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

export async function parseSource(file: string, text: string): Promise<Tree | null> {
  if (runtime.aborted() !== null) return null
  const id = languageOf(file)
  if (id === null) return null
  const language = await runtime.grammarFor(id)
  return language === null ? null : parseIn(id, language, text)
}

export async function withQueriedTree<Found>(
  id: LanguageId,
  text: string,
  pattern: string,
  read: (tree: Tree, query: Query) => Found,
  otherwise: Found,
): Promise<Found> {
  if (runtime.aborted() !== null) return otherwise
  const language = await runtime.grammarFor(id)
  if (language === null) return otherwise
  const tree = parseIn(id, language, text)
  if (tree === null) return otherwise
  try {
    return read(tree, runtime.queryFor(id, language, pattern))
  } finally {
    tree.delete()
    count("treesFreed")
  }
}

export function parserAborted(): string | null {
  return runtime.aborted()
}

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

export interface TreeCache {
  treeOf: (file: string, read: (file: string) => Promise<string | null>) => Promise<Tree | null>
  free: () => Promise<void>
}

export function treeCache(): TreeCache {
  const trees = new Memo<string, Promise<Tree | null>>()
  return {
    treeOf: async (file, read) =>
      trees.remember(file, async () => {
        const text = await read(file)
        return text === null ? null : parseSource(file, text)
      }),
    free: async () => {
      const held = trees.values()
      trees.clear()
      const parsed = await Promise.all(held)
      parsed.forEach((tree) => {
        if (tree === null) return
        tree.delete()
        count("treesFreed")
      })
    },
  }
}

export function forget(): void {
  runtime.forget()
}
