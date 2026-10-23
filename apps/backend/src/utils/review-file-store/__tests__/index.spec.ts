import { readdir } from "node:fs/promises"
import { join } from "node:path"
import { createMockReviews } from "@/procedures/get-review/utils/mocks/review-artifacts"
import { WEBHOOK_RETRY_ARTIFACT } from "@/procedures/get-review/utils/mocks/webhook-retry-artifact"
import { InMemoryReviewStore } from "@/procedures/get-review/utils/review-store"
import { savedVersionOf, type ReviewScaffold } from "@/procedures/get-review/utils/stored-review"
import { FileReviewStore } from "@/utils/review-file-store"
import { writeText } from "@/utils/text-file"
import { withTemporaryFolder } from "@/utils/text-file/__tests__/temporary-folder"
import { NO_REVIEWED_MARKS } from "@flightplan/reviewed-marks"

const NOW = new Date("2026-10-01T12:00:00.000Z")
const KEY = { repositoryName: "storefront", targetId: "branch-feature/web" }

const SCAFFOLD: ReviewScaffold = {
  artifact: WEBHOOK_RETRY_ARTIFACT,
  baseCommit: "0000000",
  request: { configurationId: "standard", preset: "standard", order: "risk-first", customOrder: null, writer: { kind: "none" }, requestedAt: NOW },
}

const MARKS = {
  waypoints: { "line-total": "1f2e" },
  files: {},
  rootBlocks: { "src/cart/subtotal.ts#function:subtotal": "5e6f" },
}

const createStore = (dataPath: string): FileReviewStore =>
  new FileReviewStore(dataPath, new InMemoryReviewStore(createMockReviews()), "0.1.11")

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

  it("saves the version that wrote the file, and reads the file as it is", async () => {
    await withTemporaryFolder(async (dataPath) => {
      const store = createStore(dataPath)

      await store.writeScaffold(KEY, SCAFFOLD)
      const text = await store.readStoredText(KEY)

      expect(text === null ? null : savedVersionOf(text)).toBe("0.1.11")
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

  it("moves a saved scaffold to another review target, and moves nothing where there is none", async () => {
    await withTemporaryFolder(async (dataPath) => {
      const store = createStore(dataPath)
      const pullRequestKey = { repositoryName: "storefront", targetId: "pr-500" }
      await store.writeScaffold(KEY, SCAFFOLD)

      await expect(store.moveScaffold(KEY, pullRequestKey)).resolves.toBe(true)
      await expect(readdir(join(dataPath, "reviews", "storefront"))).resolves.toStrictEqual(["pr-500.flightplan"])
      await expect(store.findArtifact(pullRequestKey)).resolves.toStrictEqual(WEBHOOK_RETRY_ARTIFACT)
      await expect(store.findRequest(pullRequestKey)).resolves.toStrictEqual(SCAFFOLD.request)
      await expect(store.moveScaffold(KEY, pullRequestKey)).resolves.toBe(false)
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

  it("keeps the publications of a review target on disk, and removes them with its Flight Plan", async () => {
    await withTemporaryFolder(async (dataPath) => {
      const publications = [{ kind: "claude" as const, url: "https://claude.ai/artifact/abc123", publishedAt: NOW }]
      await createStore(dataPath).writeScaffold(KEY, SCAFFOLD)

      await createStore(dataPath).writePublications(KEY, publications)

      await expect(createStore(dataPath).readPublications(KEY)).resolves.toStrictEqual(publications)
      await expect(createStore(dataPath).listTargetIds("storefront")).resolves.toStrictEqual(["branch-feature/web"])
      await createStore(dataPath).deleteScaffold(KEY)
      await expect(createStore(dataPath).readPublications(KEY)).resolves.toStrictEqual([])
    })
  })

  it("keeps the pending comments of a review target on disk, and removes them with its Flight Plan", async () => {
    await withTemporaryFolder(async (dataPath) => {
      const pendingComments = [
        { id: "c1", position: { path: "src/price.ts", side: "old" as const, startLine: 4, endLine: 6 }, body: "Why?", createdAt: NOW, commit: "abc1234" },
      ]
      await createStore(dataPath).writeScaffold(KEY, SCAFFOLD)

      await createStore(dataPath).writePendingComments(KEY, pendingComments)

      await expect(createStore(dataPath).readPendingComments(KEY)).resolves.toStrictEqual(pendingComments)
      await expect(createStore(dataPath).listTargetIds("storefront")).resolves.toStrictEqual(["branch-feature/web"])
      await createStore(dataPath).deleteScaffold(KEY)
      await expect(createStore(dataPath).readPendingComments(KEY)).resolves.toStrictEqual([])
    })
  })

  it("keeps the reviewed marks of a review target on disk, beside its Flight Plan, and removes them with it", async () => {
    await withTemporaryFolder(async (dataPath) => {
      await createStore(dataPath).writeScaffold(KEY, SCAFFOLD)

      await createStore(dataPath).writeReviewedMarks(KEY, MARKS)

      await expect(readdir(join(dataPath, "reviews", "storefront"))).resolves.toStrictEqual([
        "branch-feature%2Fweb.flightplan",
        "branch-feature%2Fweb.reviewed.json",
      ])
      await expect(createStore(dataPath).readReviewedMarks(KEY)).resolves.toStrictEqual(MARKS)
      await createStore(dataPath).deleteScaffold(KEY)
      await expect(createStore(dataPath).readReviewedMarks(KEY)).resolves.toStrictEqual(NO_REVIEWED_MARKS)
    })
  })

  it("reads the reviewed marks of the sample store where none are saved, and no marks from a file it cannot read", async () => {
    await withTemporaryFolder(async (dataPath) => {
      const sampleStore = new InMemoryReviewStore(createMockReviews())
      await sampleStore.writeReviewedMarks(KEY, MARKS)
      const store = new FileReviewStore(dataPath, sampleStore, "0.1.11")

      await expect(store.readReviewedMarks(KEY)).resolves.toStrictEqual(MARKS)
      await writeText(join(dataPath, "reviews", "storefront", "branch-feature%2Fweb.reviewed.json"), "{")
      await expect(store.readReviewedMarks(KEY)).resolves.toStrictEqual(NO_REVIEWED_MARKS)
    })
  })

  it("moves the reviewed marks, the pending comments and the publications with a moved scaffold", async () => {
    await withTemporaryFolder(async (dataPath) => {
      const store = createStore(dataPath)
      const pullRequestKey = { repositoryName: "storefront", targetId: "pr-500" }
      const publications = [{ kind: "claude" as const, url: "https://claude.ai/artifact/abc123", publishedAt: NOW }]
      await store.writeScaffold(KEY, SCAFFOLD)
      await store.writeReviewedMarks(KEY, MARKS)
      await store.writePublications(KEY, publications)

      await store.moveScaffold(KEY, pullRequestKey)

      await expect(readdir(join(dataPath, "reviews", "storefront"))).resolves.toStrictEqual([
        "pr-500.flightplan",
        "pr-500.publications.json",
        "pr-500.reviewed.json",
      ])
      await expect(store.readReviewedMarks(pullRequestKey)).resolves.toStrictEqual(MARKS)
      await expect(store.readPublications(pullRequestKey)).resolves.toStrictEqual(publications)
    })
  })

  it("reads a saved scaffold whole, for the file a published copy carries", async () => {
    await withTemporaryFolder(async (dataPath) => {
      await createStore(dataPath).writeScaffold(KEY, SCAFFOLD)

      await expect(createStore(dataPath).readScaffold(KEY)).resolves.toStrictEqual(SCAFFOLD)
      await expect(createStore(dataPath).readScaffold({ ...KEY, targetId: "pr-416" })).resolves.toBeNull()
    })
  })
})
