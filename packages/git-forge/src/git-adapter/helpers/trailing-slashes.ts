const SLASH = "/"

const keptLengthOf = (text: string): number =>
  text.split("").reduceRight((keptLength, character, index) => (keptLength === 0 && character !== SLASH ? index + 1 : keptLength), 0)

export const withoutTrailingSlashes = (text: string): string => text.slice(0, keptLengthOf(text))
