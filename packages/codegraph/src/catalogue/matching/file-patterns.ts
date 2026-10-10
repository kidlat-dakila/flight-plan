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
const LITERAL_PATTERN = /[.+^$()|\\]/g

interface Translation {
  readonly expression: string
  readonly rest: string
}

const escaped = (text: string): string => text.replace(LITERAL_PATTERN, "\\$&")

const translateSet = (glob: string): Translation => {
  const end = glob.indexOf(SET_END)
  const members = glob.slice(SET_START.length, end)
  const expression = members.startsWith(SET_NEGATION) ? `[^${members.slice(SET_NEGATION.length)}]` : `[${members}]`
  return { expression, rest: glob.slice(end + SET_END.length) }
}

const translateNext = (glob: string): Translation => {
  if (glob.startsWith(ANY_FOLDERS)) return { expression: "(?:.*/)?", rest: glob.slice(ANY_FOLDERS.length) }
  if (glob.startsWith(ANY_PATH)) return { expression: ".*", rest: glob.slice(ANY_PATH.length) }
  if (glob.startsWith(ANY_NAME)) return { expression: "[^/]*", rest: glob.slice(ANY_NAME.length) }
  if (glob.startsWith(ANY_CHARACTER)) return { expression: "[^/]", rest: glob.slice(ANY_CHARACTER.length) }
  if (glob.startsWith(CHOICE_START)) return { expression: "(?:", rest: glob.slice(CHOICE_START.length) }
  if (glob.startsWith(CHOICE_END)) return { expression: ")", rest: glob.slice(CHOICE_END.length) }
  if (glob.startsWith(CHOICE_SEPARATOR)) return { expression: "|", rest: glob.slice(CHOICE_SEPARATOR.length) }
  if (glob.startsWith(SET_START) && glob.includes(SET_END)) return translateSet(glob)
  return { expression: escaped(glob[0]), rest: glob.slice(1) }
}

const translate = (glob: string, translated = ""): string => {
  if (glob === "") return translated
  const { expression, rest } = translateNext(glob)
  return translate(rest, `${translated}${expression}`)
}

export const fitsGlob = (glob: string, filePath: string): boolean => new RegExp(`^${translate(glob)}$`).test(filePath)
