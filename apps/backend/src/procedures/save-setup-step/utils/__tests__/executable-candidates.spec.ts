import { delimiter } from "node:path"
import { executableCandidates } from "@/procedures/save-setup-step/utils/executable-candidates"

describe("executableCandidates", () => {
  it("looks through the search path, then the user's own programs folder", () => {
    const searchPath = ["/usr/local/bin", "/usr/bin"].join(delimiter)

    expect(executableCandidates("claude", searchPath, "/Users/dev")).toStrictEqual([
      "/usr/local/bin/claude",
      "/usr/bin/claude",
      "/Users/dev/.local/bin/claude",
    ])
  })

  it("still looks in the user's own programs folder without a search path", () => {
    expect(executableCandidates("claude", undefined, "/Users/dev")).toStrictEqual(["/Users/dev/.local/bin/claude"])
  })
})
