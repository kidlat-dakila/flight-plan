import { BUILT_IN_LIBRARIES } from "@/catalogue/libraries"
import { fitsGlob } from "@/catalogue/matching/file-patterns"
import type { CatalogueLibrary } from "@/catalogue/types"

export const listIgnoredGlobs = (libraries: readonly CatalogueLibrary[]): string[] =>
  libraries.flatMap((library) => library.patterns.flatMap((pattern) => (pattern.kind === "file" && pattern.isIgnored === true ? [pattern.glob] : [])))

const BUILT_IN_IGNORED_GLOBS = listIgnoredGlobs(BUILT_IN_LIBRARIES)

export const isIgnoredBy = (ignoredGlobs: readonly string[], filePath: string): boolean => ignoredGlobs.some((glob) => fitsGlob(glob, filePath))

export const isIgnoredFile = (filePath: string): boolean => isIgnoredBy(BUILT_IN_IGNORED_GLOBS, filePath)
