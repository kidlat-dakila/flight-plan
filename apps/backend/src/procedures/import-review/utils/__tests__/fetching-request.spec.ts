import { fetchingRequestOf } from "@/procedures/import-review/utils/fetching-request"

describe("fetchingRequestOf", () => {
  it("names the artifact, the file in it, where to copy it and the review target to record", () => {
    const request = fetchingRequestOf({ repositoryName: "storefront", targetId: "pr-412" }, "https://claude.ai/artifact/abc", "/data/imports/storefront/pr-412.json")

    expect(request).toContain("`url` \"https://claude.ai/artifact/abc\" and `path` \"flight-plan.json\"")
    expect(request).toContain("`/data/imports/storefront/pr-412.json`")
    expect(request).toContain("record-import with repositoryName \"storefront\" and targetId \"pr-412\"")
  })
})
