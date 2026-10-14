import { isPageRequest } from "@/server/web/page-request"

describe("isPageRequest", () => {
  it.each(["/", "/setup", "/pr-reviews/storefront/branch-release-1.2", "/pr-reviews/storefront/pr-405?filter=risk"])(
    "takes GET %s as a page of the web app",
    (url) => {
      expect(isPageRequest("GET", url)).toBe(true)
    },
  )

  it.each(["/api/trpc/missing", "/api/agent-hooks/stop", "/mcp", "/assets/missing.js"])(
    "leaves GET %s to the server",
    (url) => {
      expect(isPageRequest("GET", url)).toBe(false)
    },
  )

  it("leaves a request that is not a GET to the server", () => {
    expect(isPageRequest("POST", "/setup")).toBe(false)
  })
})
