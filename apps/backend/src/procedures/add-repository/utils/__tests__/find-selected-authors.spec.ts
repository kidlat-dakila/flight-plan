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
  it("finds the user and the tracked authors", async () => {
    await expect(
      findSelectedAuthors(findKnownAuthor, { selfAuthorId: DEV.id, trackedAuthorIds: [LENA.id] }, true),
    ).resolves.toStrictEqual({ kind: "found", authors: { selfAuthor: DEV, trackedAuthors: [LENA] } })
  })

  it("finds nobody when nobody is selected", async () => {
    await expect(
      findSelectedAuthors(findKnownAuthor, { selfAuthorId: null, trackedAuthorIds: [] }, true),
    ).resolves.toStrictEqual({ kind: "found", authors: { selfAuthor: null, trackedAuthors: [] } })
  })

  it("leaves out the user when a forge account already tells who they are", async () => {
    await expect(
      findSelectedAuthors(findKnownAuthor, { selfAuthorId: DEV.id, trackedAuthorIds: [LENA.id] }, false),
    ).resolves.toStrictEqual({ kind: "found", authors: { selfAuthor: null, trackedAuthors: [LENA] } })
  })

  it("tracks an author once, and never the user", async () => {
    await expect(
      findSelectedAuthors(
        findKnownAuthor,
        { selfAuthorId: DEV.id, trackedAuthorIds: [LENA.id, LENA.id, DEV.id] },
        true,
      ),
    ).resolves.toStrictEqual({ kind: "found", authors: { selfAuthor: DEV, trackedAuthors: [LENA] } })
  })

  it("rejects an author the repository does not have", async () => {
    await expect(
      findSelectedAuthors(findKnownAuthor, { selfAuthorId: null, trackedAuthorIds: ["ghost@acme.example"] }, false),
    ).resolves.toStrictEqual({ kind: "rejected", message: "ghost@acme.example is not an author of this repository." })
  })
})

describe("withoutIdentityAuthor", () => {
  const selection = { selfAuthorId: DEV.id, trackedAuthorIds: [LENA.id, "Mira@acme.example"] }

  it("drops the hand-picked user and the git config user from the tracked authors when git config names the user", () => {
    expect(withoutIdentityAuthor(selection, { name: "Mira", email: "mira@acme.example" })).toStrictEqual({
      selfAuthorId: null,
      trackedAuthorIds: [LENA.id],
    })
  })

  it("keeps the selection when git config names nobody", () => {
    expect(withoutIdentityAuthor(selection, null)).toBe(selection)
  })
})

describe("withIdentityAsSelf", () => {
  it("marks the git config user as the user", () => {
    expect(withIdentityAsSelf({ selfAuthorId: null, trackedAuthorIds: [LENA.id] }, { name: null, email: "mira@acme.example" }))
      .toStrictEqual({ selfAuthorId: "mira@acme.example", trackedAuthorIds: [LENA.id] })
  })

  it("keeps the hand-picked user when git config names nobody", () => {
    const selection = { selfAuthorId: DEV.id, trackedAuthorIds: [] }

    expect(withIdentityAsSelf(selection, null)).toBe(selection)
  })
})
