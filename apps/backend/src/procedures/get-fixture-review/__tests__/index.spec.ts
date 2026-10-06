import { createMockProcedureContext, type ProcedureContext } from "@/procedures/context"
import { getFixtureReview } from "@/procedures/get-fixture-review"
import { getReview } from "@/procedures/get-review"
import { PRICE_ROUNDING_ARTIFACT } from "@/procedures/get-review/utils/mocks/price-rounding-artifact"
import type { GetReviewInput } from "@/procedures/get-review/utils/schemas"
import { createInMemoryFixtureCatalog } from "@/procedures/list-fixtures/utils/fixture-catalog"
import type { Repository } from "@/procedures/list-repositories/utils/repository"

const NOW = new Date("2026-10-01T12:00:00.000Z")
const SNAPSHOT_NAME = "modified-function-formatprice"

const typescript: Repository = {
  name: "typescript",
  path: "/fixtures/typescript",
  forge: "git",
  forgeSlug: null,
  problem: null,
  hasFollowedAuthors: true,
  targets: [
    {
      kind: "pull-request",
      number: 1,
      title: "Modified function formatPrice",
      branch: SNAPSHOT_NAME,
      author: "fixture-author",
      authorAvatarUrl: null,
      branchStatus: "no-review",
      isNew: false,
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    },
  ],
}

const requestFor = (repositoryName: string, targetId: string): GetReviewInput => ({
  repositoryName,
  targetId,
  filterKeys: null,
  isShowingReviewed: false,
})

const createContext = (): ProcedureContext => ({
  ...createMockProcedureContext(NOW),
  fixtureCatalog: createInMemoryFixtureCatalog([
    { repository: typescript, artifactsBySnapshotName: new Map([[SNAPSHOT_NAME, PRICE_ROUNDING_ARTIFACT]]) },
  ]),
})

describe("getFixtureReview", () => {
  it("finds a snapshot by its case and its name, with its artifact", async () => {
    const subject = await getFixtureReview({ caseName: "typescript", snapshotName: SNAPSHOT_NAME }, createContext())

    expect(subject).toMatchObject({
      repository: { name: "typescript" },
      target: { title: "Modified function formatPrice" },
      artifact: { title: PRICE_ROUNDING_ARTIFACT.title },
      detail: {
        headCommit: PRICE_ROUNDING_ARTIFACT.commit,
        forgeUrl: null,
        reviewers: [],
        changedPaths: PRICE_ROUNDING_ARTIFACT.changedPaths,
      },
      notice: "A playground fixture. This repository and this change are not real.",
    })
  })

  it("finds nothing for a case the catalog does not have", async () => {
    await expect(getFixtureReview({ caseName: "not-a-case", snapshotName: SNAPSHOT_NAME }, createContext())).resolves.toBeNull()
  })

  it("finds nothing for a snapshot the case does not have", async () => {
    await expect(getFixtureReview({ caseName: "typescript", snapshotName: "not-a-snapshot" }, createContext())).resolves.toBeNull()
  })

  it("finds nothing when the context has no fixture catalog", async () => {
    await expect(
      getFixtureReview({ caseName: "typescript", snapshotName: SNAPSHOT_NAME }, createMockProcedureContext(NOW)),
    ).resolves.toBeNull()
  })
})

describe("getReview", () => {
  it("builds the review page of a fixture snapshot that no repository of the store lists", async () => {
    const page = await getReview(requestFor("typescript", SNAPSHOT_NAME), createContext())

    expect(page).toMatchObject({
      kind: "artifact",
      shell: { documentTitle: "Modified function formatPrice • typescript", header: { title: "Modified function formatPrice" } },
    })
  })

  it("still finds nothing for a target neither the store nor the fixtures have", async () => {
    await expect(getReview(requestFor("typescript", "not-a-snapshot"), createContext())).resolves.toBeNull()
  })
})
