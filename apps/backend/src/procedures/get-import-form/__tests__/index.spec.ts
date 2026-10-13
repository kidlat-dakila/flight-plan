import { createMockProcedureContext } from "@/procedures/context"
import { getImportForm } from "@/procedures/get-import-form"

const NOW = new Date("2026-10-01T12:00:00.000Z")
const URL = "https://claude.ai/artifact/abc"

describe("getImportForm", () => {
  it("asks before replacing the Flight Plan of a review target that has one", async () => {
    const form = await getImportForm({ repositoryName: "storefront", targetId: "pr-405", artifactUrl: URL }, createMockProcedureContext(NOW))

    expect(form).toMatchObject({ startsAtOnce: false, submitLabel: "Replace and download" })
  })

  it("starts at once for a review target that has none", async () => {
    const form = await getImportForm({ repositoryName: "storefront", targetId: "pr-416", artifactUrl: URL }, createMockProcedureContext(NOW))

    expect(form).toMatchObject({ startsAtOnce: true, warning: null })
  })

  it("refuses a link that names no Claude artifact", async () => {
    const form = await getImportForm({ repositoryName: "storefront", targetId: "pr-416", artifactUrl: "https://example.com" }, createMockProcedureContext(NOW))

    expect(form).toMatchObject({ startsAtOnce: false, submitLabel: null, reviewHref: null })
  })
})
