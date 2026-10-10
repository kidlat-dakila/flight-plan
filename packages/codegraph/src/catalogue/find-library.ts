import type { CatalogueLibrary, LibraryLanguage } from "./types"

const isOfLanguage = (library: CatalogueLibrary, language: LibraryLanguage | undefined): boolean =>
  language === undefined || library.language === language

export const findLibrary = (libraries: readonly CatalogueLibrary[], specifier: string, language?: LibraryLanguage): CatalogueLibrary | null =>
  libraries.find((library) => isOfLanguage(library, language) && library.specifiers.includes(specifier)) ?? null

export const listRepositoryConventions = (libraries: readonly CatalogueLibrary[]): CatalogueLibrary[] =>
  libraries.filter((library) => library.specifiers.length === 0)
