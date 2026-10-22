import { Memo } from "@/shared/memo"

const ANY_FOLDERS = "**/"
const ANY_PATH = "**"
const ANY_NAME = "*"
const ANY_CHARACTER = "?"
const CHOICE_START = "{"
const CHOICE_END = "}"
const CHOICE_SEPARATOR = ","
const SET_START = "["
const SET_END = "]"
const SET_NEGATION = "!"
const GROUP_END = ")"
const GROUP_SEPARATOR = "|"
const LITERAL_PATTERN = /[.+^$()|\\]/g
const GROUP_START_LENGTH = 2

const GROUP_QUANTIFIERS: ReadonlyMap<string, string> = new Map([
  ["?(", "?"],
  ["*(", "*"],
  ["+(", "+"],
  ["@(", ""],
])

interface Translation {
  readonly expression: string
  readonly rest: string
  readonly closers: readonly string[]
}

const escaped = (text: string): string => text.replace(LITERAL_PATTERN, "\\$&")

const translateSet = (glob: string, closers: readonly string[]): Translation => {
  const end = glob.indexOf(SET_END)
  const members = glob.slice(SET_START.length, end)
  const expression = members.startsWith(SET_NEGATION) ? `[^${members.slice(SET_NEGATION.length)}]` : `[${members}]`
  return { expression, rest: glob.slice(end + SET_END.length), closers }
}

const translateGroup = (glob: string, closers: readonly string[]): Translation | null => {
  const quantifier = GROUP_QUANTIFIERS.get(glob.slice(0, GROUP_START_LENGTH))
  return quantifier === undefined ? null : { expression: "(?:", rest: glob.slice(GROUP_START_LENGTH), closers: [quantifier, ...closers] }
}

const translateInGroup = (glob: string, closers: readonly string[]): Translation | null => {
  if (closers.length === 0) return null
  if (glob.startsWith(GROUP_END)) return { expression: `)${closers[0]}`, rest: glob.slice(GROUP_END.length), closers: closers.slice(1) }
  return glob.startsWith(GROUP_SEPARATOR) ? { expression: "|", rest: glob.slice(GROUP_SEPARATOR.length), closers } : null
}

const translateNext = (glob: string, closers: readonly string[]): Translation => {
  const group = translateGroup(glob, closers) ?? translateInGroup(glob, closers)
  if (group !== null) return group
  if (glob.startsWith(ANY_FOLDERS)) return { expression: "(?:.*/)?", rest: glob.slice(ANY_FOLDERS.length), closers }
  if (glob.startsWith(ANY_PATH)) return { expression: ".*", rest: glob.slice(ANY_PATH.length), closers }
  if (glob.startsWith(ANY_NAME)) return { expression: "[^/]*", rest: glob.slice(ANY_NAME.length), closers }
  if (glob.startsWith(ANY_CHARACTER)) return { expression: "[^/]", rest: glob.slice(ANY_CHARACTER.length), closers }
  if (glob.startsWith(CHOICE_START)) return { expression: "(?:", rest: glob.slice(CHOICE_START.length), closers }
  if (glob.startsWith(CHOICE_END)) return { expression: ")", rest: glob.slice(CHOICE_END.length), closers }
  if (glob.startsWith(CHOICE_SEPARATOR)) return { expression: "|", rest: glob.slice(CHOICE_SEPARATOR.length), closers }
  if (glob.startsWith(SET_START) && glob.includes(SET_END)) return translateSet(glob, closers)
  return { expression: escaped(glob[0]), rest: glob.slice(1), closers }
}

const translate = (glob: string, closers: readonly string[] = [], translated = ""): string => {
  if (glob === "") return translated
  const next = translateNext(glob, closers)
  return translate(next.rest, next.closers, `${translated}${next.expression}`)
}

const expressions = new Memo<string, RegExp>()

export const fitsGlob = (glob: string, filePath: string): boolean => expressions.remember(glob, () => new RegExp(`^${translate(glob)}$`)).test(filePath)

export const fitsFilePattern = ({ glob, excludes = [] }: { readonly glob: string, readonly excludes?: readonly string[] }, filePath: string): boolean =>
  fitsGlob(glob, filePath) && !excludes.some((excluded) => fitsGlob(excluded, filePath))
