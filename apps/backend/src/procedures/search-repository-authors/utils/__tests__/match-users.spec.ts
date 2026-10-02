import type { RepositoryAuthor } from "@/procedures/get-setup/utils/setup"
import { matchUsers } from "@/procedures/search-repository-authors/utils/match-users"

const gitUser = (name: string, email: string): RepositoryAuthor => ({ id: email, name, detail: email, avatarUrl: null })
const forgeUser = (name: string, handle: string): RepositoryAuthor => ({ id: handle, name, detail: handle, avatarUrl: null })

const LENA_ON_GIT = gitUser("Lena Okafor", "lena@acme.example")
const TEO_ON_GIT = gitUser("Teo Marchetti", "teo.m@acme.example")
const LENA_ON_FORGE = forgeUser("Lena Okafor", "@lena-ok")
const TEO_ON_FORGE = forgeUser("Teo Marchetti", "@teo")

describe("matchUsers", () => {
  it("keeps everyone when nothing is typed", () => {
    expect(matchUsers([LENA_ON_GIT, TEO_ON_GIT], "  ")).toStrictEqual([LENA_ON_GIT, TEO_ON_GIT])
  })

  it("matches part of a name, in any letter case", () => {
    expect(matchUsers([LENA_ON_GIT, TEO_ON_GIT], "OKAF")).toStrictEqual([LENA_ON_GIT])
    expect(matchUsers([LENA_ON_GIT, TEO_ON_GIT], "lena ok")).toStrictEqual([LENA_ON_GIT])
  })

  it("matches the username on a forge, with or without the @", () => {
    expect(matchUsers([LENA_ON_FORGE, TEO_ON_FORGE], "lena-ok")).toStrictEqual([LENA_ON_FORGE])
    expect(matchUsers([LENA_ON_FORGE, TEO_ON_FORGE], "@teo")).toStrictEqual([TEO_ON_FORGE])
  })

  it("treats the part of an email before the @ as the username on local git", () => {
    expect(matchUsers([LENA_ON_GIT, TEO_ON_GIT], "teo.m")).toStrictEqual([TEO_ON_GIT])
  })

  it("does not match everyone on the email's domain", () => {
    expect(matchUsers([LENA_ON_GIT, TEO_ON_GIT], "acme")).toStrictEqual([])
  })

  it("matches a whole email once the typed text has an @", () => {
    expect(matchUsers([LENA_ON_GIT, TEO_ON_GIT], "lena@acme")).toStrictEqual([LENA_ON_GIT])
  })

  it("keeps the order it was given", () => {
    expect(matchUsers([TEO_ON_GIT, LENA_ON_GIT], "e")).toStrictEqual([TEO_ON_GIT, LENA_ON_GIT])
  })
})
