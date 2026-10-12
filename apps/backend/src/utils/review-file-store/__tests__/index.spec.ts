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

  it("amends a saved artifact and keeps its request", async () => {
    await withTemporaryFolder(async (dataPath) => {
      const store = createStore(dataPath)
      await store.writeScaffold(KEY, SCAFFOLD)

      const outcome = await store.amendArtifact(KEY, (artifact) => ({ artifact: { ...artifact, title: "Retitled" }, outcome: "written" }))

      expect(outcome).toBe("written")
      await expect(createStore(dataPath).findArtifact(KEY)).resolves.toMatchObject({ title: "Retitled" })
      await expect(store.findRequest(KEY)).resolves.toStrictEqual(SCAFFOLD.request)
    })
  })

  it("applies amendments made at the same time one after the other, so none is lost", async () => {
    await withTemporaryFolder(async (dataPath) => {
      const store = createStore(dataPath)
      await store.writeScaffold(KEY, SCAFFOLD)
      const suffixes = ["a", "b", "c", "d", "e"]

      await Promise.all(
        suffixes.map(async (suffix) =>
          await store.amendArtifact(KEY, (artifact) => ({ artifact: { ...artifact, title: `${artifact.title}${suffix}` }, outcome: null }))),
      )

      await expect(store.findArtifact(KEY)).resolves.toMatchObject({ title: `${WEBHOOK_RETRY_ARTIFACT.title}abcde` })
    })
  })

  it("writes nothing when an amendment returns no artifact", async () => {
    await withTemporaryFolder(async (dataPath) => {
      const store = createStore(dataPath)
      await store.writeScaffold(KEY, SCAFFOLD)

      await expect(store.amendArtifact(KEY, () => ({ artifact: null, outcome: "refused" }))).resolves.toBe("refused")
      await expect(store.findArtifact(KEY)).resolves.toStrictEqual(WEBHOOK_RETRY_ARTIFACT)
    })
  })

  it("keeps amending after an amendment threw", async () => {
    await withTemporaryFolder(async (dataPath) => {
      const store = createStore(dataPath)
      await store.writeScaffold(KEY, SCAFFOLD)

      await expect(store.amendArtifact(KEY, () => {
        throw new Error("The amendment failed.")
      })).rejects.toThrow("The amendment failed.")
      await expect(store.amendArtifact(KEY, (artifact) => ({ artifact: { ...artifact, title: "Retitled" }, outcome: "written" }))).resolves.toBe("written")
    })
  })

  it("amends a sample artifact in the sample store, and returns null where there is no artifact", async () => {
    await withTemporaryFolder(async (dataPath) => {
      const store = createStore(dataPath)
      const sampleKey = { repositoryName: "storefront", targetId: "pr-409" }

      await store.amendArtifact(sampleKey, (artifact) => ({ artifact: { ...artifact, title: "Retitled" }, outcome: null }))

      await expect(store.findArtifact(sampleKey)).resolves.toMatchObject({ title: "Retitled" })
      await expect(readdir(dataPath)).resolves.toStrictEqual([])
      await expect(store.amendArtifact({ repositoryName: "storefront", targetId: "pr-416" }, (artifact) => ({ artifact, outcome: "written" }))).resolves.toBeNull()
    })
  })

  it("lists the review targets of a repository that have a saved scaffold, with their names decoded", async () => {
    await withTemporaryFolder(async (dataPath) => {
      const store = createStore(dataPath)
      await store.writeScaffold(KEY, SCAFFOLD)
      await store.writeScaffold({ repositoryName: "storefront", targetId: "pr-7" }, SCAFFOLD)
      await store.writeScaffold({ repositoryName: "ledger", targetId: "pr-9" }, SCAFFOLD)
      await writeText(join(dataPath, "reviews", "storefront", "notes.txt"), "not a review")

      const targetIds = await store.listTargetIds("storefront")

      expect([...targetIds].sort()).toStrictEqual(["branch-feature/web", "pr-7"])
      await expect(store.listTargetIds("gone")).resolves.toStrictEqual([])
    })
  })
})
