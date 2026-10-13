import { isClaudeArtifactUrl } from "@/procedures/record-publication/utils/claude-artifact-url"

describe("isClaudeArtifactUrl", () => {
  it("accepts both forms of a Claude artifact's address", () => {
    expect(isClaudeArtifactUrl("https://claude.ai/artifact/abc123")).toBe(true)
    expect(isClaudeArtifactUrl("https://claude.ai/code/artifact/0b7e-11")).toBe(true)
  })

  it("rejects another host, another page, plain http and text that is no address", () => {
    expect(isClaudeArtifactUrl("https://example.com/artifact/abc123")).toBe(false)
    expect(isClaudeArtifactUrl("https://claude.ai/chat/abc123")).toBe(false)
    expect(isClaudeArtifactUrl("http://claude.ai/artifact/abc123")).toBe(false)
    expect(isClaudeArtifactUrl("the artifact")).toBe(false)
  })
})
