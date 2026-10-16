import type { GrammarId } from "@/ast-graph/parser"
import type { LibraryLanguage } from "@/catalogue/types"
import { LIBRARIES } from "@/code-blocks/libraries"
import type { FileManifest } from "@/code-blocks/manifests"
import { NO_EXPORTS, type OutlinedFile } from "@/code-blocks/reading"
import { FIRST_COLUMN, FIRST_LINE } from "@/code-blocks/source-range"
import type { SourceRange } from "@/code-blocks/types"
import { hasExtension } from "@/import-graph/languages/language"
import { listExportNamings, withExportNamings } from "./file-catalogue"
import { outlinePython } from "./python"
import { outlineTypescript } from "./typescript"
import { outlineVue } from "./vue"

export interface LanguageSource {
  readonly filePath: string
  readonly source: string
  readonly importedFilePaths: ReadonlyMap<string, string>
  readonly manifest?: FileManifest
}

interface CodeBlockLanguage {
  readonly extensions: readonly string[]
  readonly language: LibraryLanguage
  readonly grammar: GrammarId
  readonly outline: (source: LanguageSource) => OutlinedFile
}

const outlineWith = (grammar: GrammarId) => (source: LanguageSource): OutlinedFile => outlineTypescript(grammar, source)

const CODE_BLOCK_LANGUAGES: readonly CodeBlockLanguage[] = [
  { extensions: [".ts", ".mts", ".cts"], language: "javascript", grammar: "typescript", outline: outlineWith("typescript") },
  { extensions: [".tsx", ".jsx", ".js", ".mjs", ".cjs"], language: "javascript", grammar: "tsx", outline: outlineWith("tsx") },
  { extensions: [".py", ".pyi"], language: "python", grammar: "python", outline: outlinePython },
  { extensions: [".vue"], language: "javascript", grammar: "typescript", outline: outlineVue },
]

const LINE_BREAK = "\n"
const WHOLE_FILE = "file"

const rangeOfText = (text: string): SourceRange => {
  const lines = text.split(LINE_BREAK)
  const lastLine = lines[lines.length - 1]
  return {
    start: { line: FIRST_LINE, column: FIRST_COLUMN },
    end: { line: lines.length - 1 + FIRST_LINE, column: lastLine.length + FIRST_COLUMN },
  }
}

export const fileBlockIdOf = (filePath: string): string => `${filePath}#${WHOLE_FILE}@${String(FIRST_LINE)}:${String(FIRST_COLUMN)}`

export const outlineWholeFile = ({ filePath, source }: LanguageSource): OutlinedFile => ({
  filePath,
  exports: NO_EXPORTS,
  read: () => ({
    filePath,
    blocks: [{ id: fileBlockIdOf(filePath), type: WHOLE_FILE, ranges: [rangeOfText(source)], parentId: null, declaredAt: [] }],
    uses: [],
    readSyntax: null,
  }),
})

const withBlocksEnsured = (outlined: OutlinedFile, source: LanguageSource, language: LibraryLanguage): OutlinedFile => ({
  ...outlined,
  read: (findExport, findBinding, findHanded) => {
    const reading = outlined.read(findExport, findBinding, findHanded)
    if (reading.blocks.length === 0) return { ...outlineWholeFile(source).read(findExport, findBinding), readSyntax: reading.readSyntax }
    return withExportNamings(reading, outlined.exports, listExportNamings(source.manifest, language, LIBRARIES))
  },
})

export const grammarOfFile = (filePath: string): GrammarId | null =>
  CODE_BLOCK_LANGUAGES.find(({ extensions }) => hasExtension(filePath, extensions))?.grammar ?? null

export const outlineFile = (source: LanguageSource): OutlinedFile => {
  const language = CODE_BLOCK_LANGUAGES.find(({ extensions }) => hasExtension(source.filePath, extensions))
  if (language === undefined) return outlineWholeFile(source)
  return withBlocksEnsured(language.outline(source), source, language.language)
}
