import { CHECKOUT_WEB, DEV, LENA } from "@/procedures/get-setup/utils/__tests__/setup-fixture"
import type { RepositoryAuthor, SetupRepository } from "@/procedures/get-setup/utils/setup"
import { buildAuthorSuggestions } from "@/procedures/search-repository-authors/utils/build-author-suggestions"

const TEO: RepositoryAuthor = { id: "teo@acme.example", name: "Teo Marchetti", detail: "teo@acme.example", avatarUrl: null }

const REPOSITORY: SetupRepository = { ...CHECKOUT_WEB, selfAuthor: DEV, trackedAuthors: [LENA] }

describe("buildAuthorSuggestions", () => {
  it("leaves out the user and marks the people already tracked when tracking another user", () => {
    expect(buildAuthorSuggestions([DEV, LENA, TEO], REPOSITORY, { role: "tracked", forge: "git", query: "" })).toStrictEqual({
      options: [
        { ...LENA, monogram: "LO", isTaken: true, stateLabel: "Tracked" },
        { ...TEO, monogram: "TM", isTaken: false, stateLabel: null },
      ],
      message: null,
    })
  })

  it("marks only the current choice when choosing which user you are", () => {
    const { options } = buildAuthorSuggestions([DEV, LENA], REPOSITORY, { role: "self", forge: "git", query: "" })

    expect(options.map((option) => [option.name, option.isTaken, option.stateLabel])).toStrictEqual([
      ["Dev Harper", true, "You"],
      ["Lena Okafor", false, null],
    ])
  })

  it("tells the user when the only match is themselves", () => {
    const search = { role: "tracked", forge: "git" } as const

    expect(buildAuthorSuggestions([DEV], REPOSITORY, { ...search, query: "" })).toStrictEqual({
      options: [],
      message: "You are tracked automatically, and you are the only one here so far.",
    })
    expect(buildAuthorSuggestions([DEV], REPOSITORY, { ...search, query: "dev" })).toStrictEqual({
      options: [],
      message: "That is you, and you are tracked automatically.",
    })
  })

  it("fills the five places with other users, not with the user", () => {
    const others = Array.from({ length: 5 }, (_unused, position): RepositoryAuthor => ({
      id: `user-${String(position)}@acme.example`,
      name: `User ${String(position)}`,
      detail: `user-${String(position)}@acme.example`,
      avatarUrl: null,
    }))

    const { options } = buildAuthorSuggestions([DEV, ...others], REPOSITORY, { role: "tracked", forge: "git", query: "" })

    expect(options.map((option) => option.name)).toStrictEqual(["User 0", "User 1", "User 2", "User 3", "User 4"])
  })

  it("offers at most five users", () => {
    const users = Array.from({ length: 9 }, (_unused, position): RepositoryAuthor => ({
      id: `user-${String(position)}@acme.example`,
      name: `User ${String(position)}`,
      detail: `user-${String(position)}@acme.example`,
      avatarUrl: null,
    }))

    const { options } = buildAuthorSuggestions(users, REPOSITORY, { role: "tracked", forge: "git", query: "user" })

    expect(options.map((option) => option.name)).toStrictEqual(["User 0", "User 1", "User 2", "User 3", "User 4"])
  })

  it("tells local git that nobody with that name or email has committed", () => {
    expect(buildAuthorSuggestions([], REPOSITORY, { role: "tracked", forge: "git", query: " zed " }).message).toBe(
      "Nobody matching “zed” has committed here. Try another name or email.",
    )
  })

  it("tells a forge that nobody with that name or username was found", () => {
    expect(buildAuthorSuggestions([], REPOSITORY, { role: "tracked", forge: "gh", query: "zed" }).message).toBe(
      "No one matching “zed” was found. Try another name or username.",
    )
  })

  it("explains an empty repository before anything is typed", () => {
    expect(buildAuthorSuggestions([], REPOSITORY, { role: "self", forge: "git", query: " " }).message).toBe(
      "Nobody has committed to this repository yet, so there is no one to pick.",
    )
    expect(buildAuthorSuggestions([], REPOSITORY, { role: "tracked", forge: "gh", query: "" }).message).toBe(
      "No one is listed in this repository yet.",
    )
  })
})
