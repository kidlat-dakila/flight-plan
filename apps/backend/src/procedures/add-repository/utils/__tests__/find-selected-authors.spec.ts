import {
  findSelectedAuthors,
  withIdentityAsSelf,
  withoutIdentityAuthor,
} from "@/procedures/add-repository/utils/find-selected-authors"
import { DEV, LENA } from "@/procedures/get-setup/utils/__tests__/setup-fixture"
import type { RepositoryAuthor } from "@/procedures/get-setup/utils/setup"

const KNOWN_AUTHORS: readonly RepositoryAuthor[] = [DEV, LENA]

const findKnownAuthor = async (authorId: string): Promise<RepositoryAuthor | null> =>
  await Promise.resolve(KNOWN_AUTHORS.find((author) => author.id === authorId) ?? null)

describe("findSelectedAuthors", () => {
  it("finds the tracked authors", async () => {
    await expect(
      findSelectedAuthors(findKnownAuthor, { trackedAuthorIds: [DEV.id, LENA.id] }),
    ).resolves.toStrictEqual({ kind: "found", authors: { selfAuthor: null, trackedAuthors: [DEV, LENA] } })
  })

  it("finds nobody when nobody is selected", async () => {
    await expect(
      findSelectedAuthors(findKnownAuthor, { trackedAuthorIds: [] }),
    ).resolves.toStrictEqual({ kind: "found", authors: { selfAuthor: null, trackedAuthors: [] } })
  })

  it("tracks an author once", async () => {
    await expect(
      findSelectedAuthors(findKnownAuthor, { trackedAuthorIds: [LENA.id, LENA.id] }),
    ).resolves.toStrictEqual({ kind: "found", authors: { selfAuthor: null, trackedAuthors: [LENA] } })
  })

  it("rejects an author the repository does not have", async () => {
    await expect(
      findSelectedAuthors(findKnownAuthor, { trackedAuthorIds: ["ghost@acme.example"] }),
    ).resolves.toStrictEqual({ kind: "rejected", message: "ghost@acme.example is not an author of this repository." })
  })
})

describe("withoutIdentityAuthor", () => {
  const selection = { trackedAuthorIds: [LENA.id, "Mira@acme.example"] }

  it("drops the git config user from the tracked authors", () => {
    expect(withoutIdentityAuthor(selection, { name: "Mira", email: "mira@acme.example" })).toStrictEqual({
      trackedAuthorIds: [LENA.id],
    })
  })

  it("keeps the selection when git config names nobody", () => {
    expect(withoutIdentityAuthor(selection, null)).toBe(selection)
  })
})

describe("withIdentityAsSelf", () => {
  it("marks the git config user as the user", () => {
    expect(withIdentityAsSelf({ trackedAuthorIds: [LENA.id] }, { name: null, email: "mira@acme.example" }))
      .toStrictEqual({ selfAuthorId: "mira@acme.example", trackedAuthorIds: [LENA.id] })
  })

  it("marks nobody as the user when git config names nobody", () => {
    expect(withIdentityAsSelf({ trackedAuthorIds: [] }, null)).toStrictEqual({ selfAuthorId: null, trackedAuthorIds: [] })
  })
})
