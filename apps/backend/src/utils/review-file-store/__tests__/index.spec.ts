import { readdir } from "node:fs/promises"
import { join } from "node:path"
import { createMockReviews } from "@/procedures/get-review/utils/mocks/review-artifacts"
import { WEBHOOK_RETRY_ARTIFACT } from "@/procedures/get-review/utils/mocks/webhook-retry-artifact"
import { InMemoryReviewStore } from "@/procedures/get-review/utils/review-store"
import type { ReviewScaffold } from "@/procedures/get-review/utils/stored-review"
import { FileReviewStore } from "@/utils/review-file-store"
import { writeText } from "@/utils/text-file"
import { withTemporaryFolder } from "@/utils/text-file/__tests__/temporary-folder"

const NOW = new Date("2026-10-01T12:00:00.000Z")
const KEY = { repositoryName: "storefront", targetId: "branch-feature/web" }

const SCAFFOLD: ReviewScaffold = {
  artifact: WEBHOOK_RETRY_ARTIFACT,
  baseCommit: "0000000",
  request: { preset: "standard", order: "risk-first", customOrder: null, writer: { kind: "manual" }, requestedAt: NOW },
}

const createStore = (dataPath: string): FileReviewStore =>
  new FileReviewStore(dataPath, new InMemoryReviewStore(createMockReviews(NOW)))

describe("FileReviewStore", () => {
  it("saves a scaffold as one .flightplan file per review target, with the name encoded", async () => {
    await withTemporaryFolder(async (dataPath) => {
      const store = createStore(dataPath)

      await store.writeScaffold(KEY, SCAFFOLD)

      await expect(readdir(join(dataPath, "reviews", "storefront"))).resolves.toStrictEqual(["branch-feature%2Fweb.flightplan"])
      await expect(store.findArtifact(KEY)).resolves.toStrictEqual(WEBHOOK_RETRY_ARTIFACT)
      await expect(store.findRequest(KEY)).resolves.toStrictEqual(SCAFFOLD.request)
    })
  })

  it("reads a saved scaffold from another store on the same data directory", async () => {
    await withTemporaryFolder(async (dataPath) => {
      await createStore(dataPath).writeScaffold(KEY, SCAFFOLD)

      await expect(createStore(dataPath).findArtifact(KEY)).resolves.toStrictEqual(WEBHOOK_RETRY_ARTIFACT)
    })
  })

  it("falls back to the sample store for a review target with no saved file", async () => {
    await withTemporaryFolder(async (dataPath) => {
      const store = createStore(dataPath)

      await expect(store.findArtifact({ repositoryName: "storefront", targetId: "pr-409" })).resolves.toStrictEqual(WEBHOOK_RETRY_ARTIFACT)
      await expect(store.findArtifact({ repositoryName: "storefront", targetId: "pr-416" })).resolves.toBeNull()
      await expect(store.findRequest({ repositoryName: "storefront", targetId: "pr-416" })).resolves.toBeNull()
    })
  })

  it("refuses a saved file it cannot read, without naming its path", async () => {
    await withTemporaryFolder(async (dataPath) => {
      await writeText(join(dataPath, "reviews", "storefront", "pr-416.flightplan"), "{}")

      await expect(createStore(dataPath).findArtifact({ repositoryName: "storefront", targetId: "pr-416" })).rejects.toThrow(
        "A saved review artifact cannot be read.",
      )
    })
  })
})
