import { selectReviewerOptions } from "@/procedures/search-reviewers/utils/select-reviewer-options"

const candidate = (login: string, name = login) => ({ login, name, avatarUrl: null })

describe("selectReviewerOptions", () => {
  it("leaves out the author and the people who are reviewers already, whatever the case of the login", () => {
    expect(
      selectReviewerOptions({
        candidates: [candidate("Ada"), candidate("grace", "Grace Hopper"), candidate("linus")],
        reviewers: [{ login: "LINUS", name: "Linus", avatarUrl: null, state: "pending" }],
        authorLogin: "ada",
      }),
    ).toStrictEqual([{ login: "grace", name: "Grace Hopper", detail: "@grace", avatarUrl: null, monogram: "GH" }])
  })
})
