import type { CatalogueLibrary, CataloguePattern, MethodPattern } from "./types"

const EVERY_VERSION = "*"
const KEY_PART_SEPARATOR = ":"
const METHOD_SEPARATOR = ">"
const SPECIFIER_SEPARATOR = "@"
const CALLED_VALUE = "called"

const subjectOf = (pattern: CataloguePattern): string => {
  if (pattern.kind === "file") return pattern.glob
  if (pattern.kind === "directive") return pattern.text
  return pattern.from === undefined ? pattern.name : `${pattern.name}${SPECIFIER_SEPARATOR}${pattern.from}`
}

export const patternKeyOf = (pattern: CataloguePattern): string =>
  [pattern.kind, subjectOf(pattern), pattern.versions ?? EVERY_VERSION].join(KEY_PART_SEPARATOR)

const below = (key: string, memberKeys: readonly string[]): string[] => memberKeys.map((memberKey) => `${key}${METHOD_SEPARATOR}${memberKey}`)

const methodKeysOf = (methods: readonly MethodPattern[]): string[] => methods.flatMap((method) => keysOf(method))

const calledKeysOf = (pattern: CataloguePattern): string[] =>
  pattern.kind === "factory" && pattern.called !== undefined
    ? [CALLED_VALUE, ...below(CALLED_VALUE, methodKeysOf(pattern.called.methods ?? []))]
    : []

function keysOf(pattern: CataloguePattern): string[] {
  const key = patternKeyOf(pattern)
  if (pattern.kind !== "factory" && pattern.kind !== "class") return [key]
  return [key, ...below(key, [...methodKeysOf(pattern.methods), ...calledKeysOf(pattern)])]
}

export const listPatternKeys = (library: CatalogueLibrary): string[] => library.patterns.flatMap(keysOf)
