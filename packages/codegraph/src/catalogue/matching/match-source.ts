import { patternKeyOf } from "@/catalogue/pattern-keys"
import type { CatalogueLibrary, DirectivePattern, FilePattern, LibraryLanguage } from "@/catalogue/types"
import { FIRST_COLUMN, FIRST_LINE, rangeOfNode } from "@/code-blocks/source-range"
import type { SourceRange } from "@/code-blocks/types"
import { hasExtension } from "@/import-graph/languages/language"
import { fitsGlob } from "./file-patterns"
import { readJavascript } from "./javascript-reader"
import { matchSites, type PatternMatch } from "./match-sites"
import { readPython } from "./python-reader"
import type { SyntaxReader } from "./syntax-reader"
import { isSingleFileComponent, readVue } from "./vue-reader"

export interface MatchedSource {
  readonly filePath: string | null
  readonly language: LibraryLanguage
  readonly text: string
}

const EXTENSIONS_BY_LANGUAGE: Readonly<Record<LibraryLanguage, readonly string[]>> = {
  javascript: [".ts", ".mts", ".cts", ".tsx", ".jsx", ".js", ".mjs", ".cjs", ".vue"],
  python: [".py"],
}
const LANGUAGES: readonly LibraryLanguage[] = ["javascript", "python"]
const START_OF_FILE: SourceRange = { start: { line: FIRST_LINE, column: FIRST_COLUMN }, end: { line: FIRST_LINE, column: FIRST_COLUMN } }

const saysNothingMore = { makes: null, slots: [], path: null, prefix: null, method: null, event: null, unfilledPlaces: [], members: [], isProviding: false, isOwnNode: false }

export const languageOfFile = (filePath: string): LibraryLanguage | null =>
  LANGUAGES.find((language) => hasExtension(filePath, EXTENSIONS_BY_LANGUAGE[language])) ?? null

export const readSyntax = (language: LibraryLanguage, text: string): SyntaxReader => {
  if (language === "python") return readPython(text)
  return isSingleFileComponent(text) ? readVue(text) : readJavascript(text)
}

const isFilePattern = (pattern: CatalogueLibrary["patterns"][number]): pattern is FilePattern => pattern.kind === "file"

const isDirectivePattern = (pattern: CatalogueLibrary["patterns"][number]): pattern is DirectivePattern => pattern.kind === "directive"

export const matchFilePath = (filePath: string, libraries: readonly CatalogueLibrary[]): PatternMatch[] =>
  libraries.flatMap((library) =>
    library.patterns
      .filter(isFilePattern)
      .filter((pattern) => fitsGlob(pattern.glob, filePath))
      .map((pattern) => ({
        ...saysNothingMore,
        library: library.name,
        specifier: null,
        patternKey: patternKeyOf(pattern),
        name: pattern.glob,
        site: "file" as const,
        range: START_OF_FILE,
        runs: null,
        versions: pattern.versions ?? null,
      })),
  )

const matchDirectives = (reader: SyntaxReader, libraries: readonly CatalogueLibrary[]): PatternMatch[] =>
  reader.listDirectives().flatMap((directive) =>
    libraries
      .filter((library) => library.language === reader.language)
      .flatMap((library) =>
        library.patterns
          .filter(isDirectivePattern)
          .filter((pattern) => pattern.text === directive.text)
          .map((pattern) => ({
            ...saysNothingMore,
            library: library.name,
            specifier: null,
            patternKey: patternKeyOf(pattern),
            name: pattern.text,
            site: "directive" as const,
            range: rangeOfNode(directive.node),
            runs: pattern.runs,
            method: pattern.method ?? null,
            versions: pattern.versions ?? null,
          })),
      ),
  )

export const matchSyntax = (reader: SyntaxReader, libraries: readonly CatalogueLibrary[]): PatternMatch[] => [
  ...matchSites(reader, libraries),
  ...matchDirectives(reader, libraries),
]

export const matchSource = ({ filePath, language, text }: MatchedSource, libraries: readonly CatalogueLibrary[]): PatternMatch[] => [
  ...(filePath === null ? [] : matchFilePath(filePath, libraries)),
  ...matchSyntax(readSyntax(language, text), libraries),
]
