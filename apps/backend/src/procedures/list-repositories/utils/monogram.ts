const WORD_SEPARATOR_PATTERN = /[\s._-]+/
const UNKNOWN_PERSON_MONOGRAM = "?"

const initialOf = (word: string | undefined): string => word?.charAt(0) ?? ""

export const monogramOf = (name: string): string => {
  const words = name.trim().split(WORD_SEPARATOR_PATTERN).filter((word) => word !== "")
  if (words.length === 0) return UNKNOWN_PERSON_MONOGRAM
  const lastInitial = words.length > 1 ? initialOf(words[words.length - 1]) : ""
  return `${initialOf(words[0])}${lastInitial}`.toUpperCase()
}
