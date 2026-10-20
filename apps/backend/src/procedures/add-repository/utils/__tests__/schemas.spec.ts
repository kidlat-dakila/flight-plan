import { addRepositoryInputSchema } from "@/procedures/add-repository/utils/schemas"
import { addSetupRepositoryInputSchema } from "@/procedures/add-setup-repository/utils/schemas"
import { searchAdditionAuthorsInputSchema } from "@/procedures/search-addition-authors/utils/schemas"

const PATH_ONLY = { path: "/work/ledger-api" }
const WITH_AUTHORS = { ...PATH_ONLY, trackedAuthorIds: ["lena@acme.example"] }
const NO_REPOSITORY_NAME = { repositoryName: null }

describe("repository addition input schemas", () => {
  it.each([addRepositoryInputSchema, addSetupRepositoryInputSchema])(
    "need the tracked authors along with the path",
    (schema) => {
      expect(schema.safeParse(WITH_AUTHORS).success).toBe(true)
      expect(schema.safeParse(PATH_ONLY).success).toBe(false)
    },
  )

  it("rejects an author role the author search does not know", () => {
    const search = { ...WITH_AUTHORS, ...NO_REPOSITORY_NAME, query: "" }

    expect(searchAdditionAuthorsInputSchema.safeParse({ ...search, role: "tracked" }).success).toBe(true)
    expect(searchAdditionAuthorsInputSchema.safeParse({ ...search, role: "owner" }).success).toBe(false)
  })
})
