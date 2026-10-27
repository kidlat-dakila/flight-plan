import { codeBlocksPathOf } from "@test-setup/code-block-snapshot"

describe("codeBlocksPathOf", () => {
  it("puts the code blocks of a fixture in the code-blocks folder of its case", () => {
    expect(codeBlocksPathOf("/test-cases", "demo-fastapi/implement-route-api-pokemon")).toBe(
      "/test-cases/demo-fastapi/code-blocks/implement-route-api-pokemon.code-blocks.json",
    )
  })
})
