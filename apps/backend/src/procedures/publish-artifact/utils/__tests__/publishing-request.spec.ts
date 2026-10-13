import { publishingRequestOf } from "@/procedures/publish-artifact/utils/publishing-request"

const KEY = { repositoryName: "storefront", targetId: "pr-412" }
const FILES = {
  folderPath: "/data/publications/storefront/pr-412",
  pageFileName: "index.html",
  supportingFileNames: ["app.js", "app.css", "review-data.js"],
}

describe("publishingRequestOf", () => {
  it("names the folder, the page, its supporting files and the review target to record", () => {
    const request = publishingRequestOf(KEY, FILES, null)

    expect(request).toContain("`/data/publications/storefront/pr-412`")
    expect(request).toContain("`file_path` set to the copied `index.html`")
    expect(request).toContain("[{\"path\":\"app.js\"},{\"path\":\"app.css\"},{\"path\":\"review-data.js\"}]")
    expect(request).toContain("record-publication with repositoryName \"storefront\", targetId \"pr-412\"")
  })

  it("asks for a new artifact the first time", () => {
    expect(publishingRequestOf(KEY, FILES, null)).toContain("pass no `url`")
  })

  it("asks to update the earlier artifact in place", () => {
    const request = publishingRequestOf(KEY, FILES, "https://claude.ai/artifact/abc")

    expect(request).toContain("pass `url` \"https://claude.ai/artifact/abc\"")
    expect(request).not.toContain("pass no `url`")
  })
})
