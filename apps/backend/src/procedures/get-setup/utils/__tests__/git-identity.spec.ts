import {
  isSelfAuthorChoiceNeeded,
  parseGitIdentity,
  repositoryIdentityOf,
  selfAuthorIdOf,
  selfAuthorOf,
} from "@/procedures/get-setup/utils/git-identity"
import { DEV } from "./setup-fixture"

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

describe("selfAuthorOf", () => {
  it("names the user git config gives before the user picked by hand", () => {
    expect(selfAuthorOf(IDENTITY, DEV)).toStrictEqual({
      id: "lena@acme.example",
      name: "Lena Okafor",
      detail: "lena@acme.example",
      avatarUrl: null,
    })
    expect(selfAuthorIdOf(IDENTITY, DEV)).toBe("lena@acme.example")
  })

  it("names the user by their email when git config has no name", () => {
    expect(selfAuthorOf({ name: null, email: "lena@acme.example" }, null)).toMatchObject({ name: "lena@acme.example" })
  })

  it("falls back to the user picked by hand when git config has no email", () => {
    expect(selfAuthorOf(null, DEV)).toBe(DEV)
    expect(selfAuthorIdOf(null, null)).toBeNull()
  })
})

describe("isSelfAuthorChoiceNeeded", () => {
  it("asks the user to pick themselves only on local git without an email in git config", () => {
    expect(isSelfAuthorChoiceNeeded("git", null)).toBe(true)
    expect(isSelfAuthorChoiceNeeded("git", IDENTITY)).toBe(false)
    expect(isSelfAuthorChoiceNeeded("gh", null)).toBe(false)
  })
})

describe("repositoryIdentityOf", () => {
  it("reads the identity of a repository by its path", () => {
    expect(repositoryIdentityOf({ "/work/ledger": IDENTITY }, "/work/ledger")).toBe(IDENTITY)
    expect(repositoryIdentityOf({ "/work/ledger": IDENTITY }, "/work/storefront")).toBeNull()
  })
})
