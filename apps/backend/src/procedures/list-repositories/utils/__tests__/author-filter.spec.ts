import { buildAuthorFilter, selectAuthorKeys } from "@/procedures/list-repositories/utils/author-filter"
import type { Repository, ReviewTarget } from "@/procedures/list-repositories/utils/repository"

const UPDATED_AT = new Date("2026-10-01T12:00:00.000Z")

const pullRequestBy = (author: string, number: number): ReviewTarget => ({
  kind: "pull-request",
  number,
  title: "A change",
  branch: "feature/change",
  author,
  authorAvatarUrl: author === "mira" ? "https://forge.test/mira.png" : null,
  branchStatus: "stale", isNew: false,
  updatedAt: UPDATED_AT,
})

const repository: Repository = {
  name: "storefront",
  path: "/work/storefront",
  baseBranch: null,
  forge: "gh",
  forgeSlug: "acme/storefront",
  problem: null,
  targets: [
    pullRequestBy("teo", 1),
    pullRequestBy("mira", 2),
    { kind: "branch", name: "local", branchStatus: "no-review", isNew: false, updatedAt: UPDATED_AT },
    pullRequestBy("teo", 3),
  ],
}

describe("selectAuthorKeys", () => {
  it("selects every author, and review targets with no author, when nothing is requested", () => {
    expect(selectAuthorKeys([repository], null)).toStrictEqual(["mira", "teo", ""])
  })

  it("keeps the requested authors it knows", () => {
    expect(selectAuthorKeys([repository], ["teo", "stranger"])).toStrictEqual(["teo"])
  })

  it("selects nobody when an empty selection is requested", () => {
    expect(selectAuthorKeys([repository], [])).toStrictEqual([])
  })
})

describe("buildAuthorFilter", () => {
  it("lists each author once by name, with no author last, and counts their review targets", () => {
    expect(buildAuthorFilter([repository], ["mira", "teo", ""])).toMatchObject({
      buttonLabel: "Author: all",
      isDefault: true,
      options: [
        {
          key: "mira",
          label: "mira",
          person: { avatarUrl: "https://forge.test/mira.png", monogram: "M" },
          countLabel: "1",
          isSelected: true,
        },
        { key: "teo", label: "teo", person: { avatarUrl: null, monogram: "T" }, countLabel: "2", isSelected: true },
        { key: "", label: "No author", person: null, countLabel: "1", isSelected: true },
      ],
    })
  })

  it("names a partial selection on its button", () => {
    expect(buildAuthorFilter([repository], ["teo"])).toMatchObject({ buttonLabel: "Author: 1 of 3", isDefault: false })
  })

  it("says who is selected after an option is toggled, and nothing once everyone is", () => {
    const filter = buildAuthorFilter([repository], ["mira", "teo"])

    expect(filter.options.map((option) => option.toggledAuthors)).toStrictEqual([["teo"], ["mira"], null])
  })
})
