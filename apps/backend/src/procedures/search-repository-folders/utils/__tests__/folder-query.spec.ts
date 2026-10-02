import { hasEnoughCharacters } from "@/procedures/search-repository-folders/utils/folder-query"

describe("hasEnoughCharacters", () => {
  it.each([
    ["", false],
    ["ab", false],
    ["  ab  ", false],
    ["abc", true],
    ["  abc  ", true],
    ["a b", true],
  ])("tells whether “%s” is long enough to search: %s", (query, isLongEnough) => {
    expect(hasEnoughCharacters(query)).toBe(isLongEnough)
  })
})
