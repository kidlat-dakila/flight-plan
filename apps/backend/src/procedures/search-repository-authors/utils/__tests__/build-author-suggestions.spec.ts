import { CHECKOUT_WEB, DEV, LENA } from "@/procedures/get-setup/utils/__tests__/setup-fixture"
import type { RepositoryAuthor, SetupRepository } from "@/procedures/get-setup/utils/setup"
import { buildAuthorSuggestions } from "@/procedures/search-repository-authors/utils/build-author-suggestions"

const TEO: RepositoryAuthor = { id: "teo@acme.example", name: "Teo Marchetti", detail: "teo@acme.example", avatarUrl: null }

const REPOSITORY: SetupRepository = { ...CHECKOUT_WEB, selfAuthor: DEV, trackedAuthors: [LENA] }

describe("buildAuthorSuggestions", () => {
  it("marks the user and the authors that are already tracked when tracking another author", () => {
    expect(buildAuthorSuggestions([DEV, LENA, TEO], REPOSITORY, { role: "tracked", query: "" })).toStrictEqual({
      options: [
        { ...DEV, monogram: "DH", isTaken: true, stateLabel: "You" },
        { ...LENA, monogram: "LO", isTaken: true, stateLabel: "Tracked" },
        { ...TEO, monogram: "TM", isTaken: false, stateLabel: null },
      ],
      message: null,
    })
  })

  it("marks only the current choice when choosing which author is the user", () => {
    const { options } = buildAuthorSuggestions([DEV, LENA], REPOSITORY, { role: "self", query: "" })

    expect(options.map((option) => [option.name, option.isTaken, option.stateLabel])).toStrictEqual([
      ["Dev Harper", true, "You"],
      ["Lena Okafor", false, null],
    ])
  })

  it("says that nobody matches the typed text", () => {
    expect(buildAuthorSuggestions([], REPOSITORY, { role: "tracked", query: "zed" }).message).toBe(
      "No author matches “zed”.",
    )
    expect(buildAuthorSuggestions([], REPOSITORY, { role: "self", query: " " }).message).toBe(
      "No authors were found in this repository.",
    )
  })
})
