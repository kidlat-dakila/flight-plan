import { buildImportForm, type ImportFacts } from "@/procedures/get-import-form/utils/build-import-form"
import type { ImportRequest } from "@/procedures/import-review/utils/import-request"

const URL = "https://claude.ai/artifact/abc"
const REQUEST: ImportRequest = { artifactUrl: URL, channel: "agent", requestedAt: new Date("2026-10-01T12:00:00.000Z"), importedAt: null }

const factsOf = (overrides: Partial<ImportFacts> = {}): ImportFacts => ({
  key: { repositoryName: "storefront", targetId: "branch-feature/web" },
  artifactUrl: URL,
  isArtifactUrl: true,
  target: { kind: "found", workingPath: "/work/storefront" },
  hasFlightPlan: false,
  request: null,
  isImporting: false,
  ...overrides,
})

describe("buildImportForm", () => {
  it("starts at once for a review target with no Flight Plan, and names where it goes", () => {
    expect(buildImportForm(factsOf())).toMatchObject({
      startsAtOnce: true,
      warning: null,
      isImporting: false,
      isFinished: false,
      importId: null,
      reviewHref: "/pr-reviews/storefront/branch-feature%2Fweb",
      details: [{ value: "storefront" }, { value: "branch-feature/web" }, { value: URL }],
    })
  })

  it("asks before replacing a Flight Plan the review target already has", () => {
    expect(buildImportForm(factsOf({ hasFlightPlan: true }))).toMatchObject({
      startsAtOnce: false,
      submitLabel: "Replace and download",
      warning: "This review target already has a Flight Plan here. Downloading replaces it.",
    })
  })

  it("waits while the agent fetches it", () => {
    expect(buildImportForm(factsOf({ request: REQUEST, isImporting: true }))).toMatchObject({
      startsAtOnce: false,
      isImporting: true,
      isFinished: false,
      importId: "2026-10-01T12:00:00.000Z",
      submitLabel: null,
    })
  })

  it("is finished once the Flight Plan of this artifact is stored", () => {
    const imported = { ...REQUEST, importedAt: new Date("2026-10-01T12:02:00.000Z") }

    expect(buildImportForm(factsOf({ request: imported, hasFlightPlan: true }))).toMatchObject({
      isFinished: true,
      importId: "2026-10-01T12:00:00.000Z",
      message: "The Flight Plan is stored.",
      startsAtOnce: false,
    })
  })

  it("offers to try again, without starting by itself, when the agent stopped first", () => {
    expect(buildImportForm(factsOf({ request: REQUEST }))).toMatchObject({ startsAtOnce: false, isImporting: false, submitLabel: "Try again" })
  })

  it("does not take the import of another artifact as its own", () => {
    const other = { ...REQUEST, artifactUrl: "https://claude.ai/artifact/other", importedAt: new Date("2026-10-01T12:02:00.000Z") }

    expect(buildImportForm(factsOf({ request: other }))).toMatchObject({ isFinished: false, importId: null, startsAtOnce: true })
  })

  it("refuses a link that names no Claude artifact, and a repository Flight Plan does not follow", () => {
    expect(buildImportForm(factsOf({ isArtifactUrl: false }))).toMatchObject({ startsAtOnce: false, submitLabel: null, reviewHref: null, details: [] })
    expect(buildImportForm(factsOf({ target: { kind: "rejected", message: "Flight Plan has no repository named \"storefront\"." } }))).toMatchObject({
      message: "Flight Plan has no repository named \"storefront\".",
      startsAtOnce: false,
      submitLabel: null,
    })
  })
})
