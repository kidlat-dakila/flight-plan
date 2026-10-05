import { CLAUDE_MODEL_QUERY, parseClaudeModels } from "@/procedures/get-setup/utils/claude-model-query"

const replyWith = (models: readonly unknown[]): string =>
  JSON.stringify({ type: "control_response", response: { subtype: "success", request_id: "models", response: { models } } })

describe("parseClaudeModels", () => {
  it("reads each model's value, name and efforts from the reply", () => {
    const output = replyWith([
      { value: "default", displayName: "Default (recommended)", description: "Opus 5.5", supportedEffortLevels: ["low", "xhigh"] },
      { value: "haiku", displayName: "Haiku 4.5", description: "Fastest" },
    ])

    expect(parseClaudeModels(output)).toStrictEqual([
      { model: "default", label: "Default (recommended)", efforts: ["low", "xhigh"] },
      { model: "haiku", label: "Haiku 4.5", efforts: [] },
    ])
  })

  it("finds the reply among other lines of output", () => {
    const output = [
      JSON.stringify({ type: "system", subtype: "hook_started" }),
      "not json",
      replyWith([{ value: "opus", displayName: "Opus 5.5" }]),
      "",
    ].join("\n")

    expect(parseClaudeModels(output)).toStrictEqual([{ model: "opus", label: "Opus 5.5", efforts: [] }])
  })

  it("reads no models from output without a reply, or with a reply in another shape", () => {
    expect(parseClaudeModels("")).toStrictEqual([])
    expect(parseClaudeModels("claude: command failed")).toStrictEqual([])
    expect(parseClaudeModels(replyWith([{ value: 4 }]))).toStrictEqual([])
  })
})

describe("CLAUDE_MODEL_QUERY", () => {
  it("is one line that asks Claude to describe itself", () => {
    expect(CLAUDE_MODEL_QUERY.endsWith("\n")).toBe(true)
    expect(JSON.parse(CLAUDE_MODEL_QUERY)).toMatchObject({ type: "control_request", request: { subtype: "initialize" } })
  })
})
