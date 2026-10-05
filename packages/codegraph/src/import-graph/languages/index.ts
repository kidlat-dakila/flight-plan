import { hasExtension, type ImportLanguage } from "./language"
import { pythonImportLanguage } from "./python"
import { typescriptImportLanguage } from "./typescript"

export const IMPORT_LANGUAGES: readonly ImportLanguage[] = [typescriptImportLanguage, pythonImportLanguage]

export const importLanguageOf = (filePath: string): ImportLanguage | null =>
  IMPORT_LANGUAGES.find((language) => hasExtension(filePath, language.extensions)) ?? null
