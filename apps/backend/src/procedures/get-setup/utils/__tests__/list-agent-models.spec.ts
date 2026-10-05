import { listModelsOf } from "@/procedures/get-setup/utils/list-agent-models"
import type { SetupEnvironment } from "@/procedures/get-setup/utils/setup-environment"

const OPUS = { model: "opus", label: "Opus 5.5", efforts: ["low"] }

const listAgentModels: SetupEnvironment["listAgentModels"] = async (agent) =>
  await Promise.resolve(agent === "claude" ? [OPUS] : [])

describe("listModelsOf", () => {
  it("asks each named agent for its models", async () => {
    await expect(listModelsOf(["claude", "codex"], { listAgentModels })).resolves.toStrictEqual({ claude: [OPUS], codex: [] })
  })

  it("asks no agent when none is named", async () => {
    await expect(listModelsOf([], { listAgentModels })).resolves.toStrictEqual({})
  })
})
