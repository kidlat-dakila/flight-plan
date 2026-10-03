import { findSelectedAuthors } from "@/procedures/add-repository/utils/find-selected-authors"
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
