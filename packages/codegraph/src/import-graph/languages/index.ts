import { hasExtension, type ImportLanguage } from "./language"
import { typescriptImportLanguage } from "./typescript"

export const IMPORT_LANGUAGES: readonly ImportLanguage[] = [typescriptImportLanguage]

export const importLanguageOf = (filePath: string): ImportLanguage | null =>
  IMPORT_LANGUAGES.find((language) => hasExtension(filePath, language.extensions)) ?? null
