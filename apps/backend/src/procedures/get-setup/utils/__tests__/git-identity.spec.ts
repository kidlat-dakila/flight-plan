import {
  parseGitIdentity,
  repositoryIdentityOf,
  selfAuthorIdOf,
  toIdentityAuthor,
} from "@/procedures/get-setup/utils/git-identity"

const IDENTITY = { name: "Lena Okafor", email: "lena@acme.example" }

describe("parseGitIdentity", () => {
  it("reads the name and the email, with the email in lower case", () => {
    expect(parseGitIdentity("Lena Okafor\n", "Lena@Acme.example\n")).toStrictEqual(IDENTITY)
  })

  it("reads an identity without a name", () => {
    expect(parseGitIdentity(null, "lena@acme.example")).toStrictEqual({ name: null, email: "lena@acme.example" })
    expect(parseGitIdentity("  \n", "lena@acme.example")).toStrictEqual({ name: null, email: "lena@acme.example" })
  })

  it("reads no identity without an email", () => {
    expect(parseGitIdentity("Lena Okafor", null)).toBeNull()
    expect(parseGitIdentity("Lena Okafor", "\n")).toBeNull()
  })
})

describe("toIdentityAuthor", () => {
  it("names the user git config gives", () => {
    expect(toIdentityAuthor(IDENTITY)).toStrictEqual({
      id: "lena@acme.example",
      name: "Lena Okafor",
      detail: "lena@acme.example",
      avatarUrl: null,
    })
  })

  it("names the user by their email when git config has no name", () => {
    expect(toIdentityAuthor({ name: null, email: "lena@acme.example" })).toMatchObject({ name: "lena@acme.example" })
  })
})

describe("selfAuthorIdOf", () => {
  it("is the email git config gives, and nobody without one", () => {
    expect(selfAuthorIdOf(IDENTITY)).toBe("lena@acme.example")
    expect(selfAuthorIdOf(null)).toBeNull()
  })
})

describe("repositoryIdentityOf", () => {
  it("reads the identity of a repository by its path", () => {
    expect(repositoryIdentityOf({ "/work/ledger": IDENTITY }, "/work/ledger")).toBe(IDENTITY)
    expect(repositoryIdentityOf({ "/work/ledger": IDENTITY }, "/work/storefront")).toBeNull()
  })
})
