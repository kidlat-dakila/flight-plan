import { chmod, mkdir, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { createAgentModelLister } from "@/utils/agent-model-lister"
import { withTemporaryFolder } from "@/utils/text-file/__tests__/temporary-folder"

const EXECUTABLE_MODE = 0o755

const MODEL_REPLY = JSON.stringify({
  type: "control_response",
  response: {
    subtype: "success",
    request_id: "models",
    response: { models: [{ value: "opus", displayName: "Opus 5.5", supportedEffortLevels: ["low", "xhigh"] }] },
  },
})

const addProgram = async (folder: string, name: string, script: string): Promise<void> => {
  await mkdir(join(folder, "bin"), { recursive: true })
  await writeFile(join(folder, "bin", name), `#!/bin/sh\n${script}\n`)
  await chmod(join(folder, "bin", name), EXECUTABLE_MODE)
}

const replyingScript = (folder: string): string =>
  [`cat > "${join(folder, "request")}"`, `echo run >> "${join(folder, "runs")}"`, `echo '${MODEL_REPLY}'`].join("\n")

const listerIn = (folder: string) =>
  createAgentModelLister({ homePath: folder, environment: { PATH: `${join(folder, "bin")}:/bin:/usr/bin` } })

describe("createAgentModelLister", () => {
  it("asks the claude program for its models", async () => {
    await withTemporaryFolder(async (folder) => {
      await addProgram(folder, "claude", replyingScript(folder))

      await expect(listerIn(folder)("claude")).resolves.toStrictEqual([
        { model: "opus", label: "Opus 5.5", efforts: ["low", "xhigh"] },
      ])
      expect(JSON.parse(await readFile(join(folder, "request"), "utf8"))).toMatchObject({
        type: "control_request",
        request: { subtype: "initialize" },
      })
    })
  })

  it("asks an agent once and keeps its answer", async () => {
    await withTemporaryFolder(async (folder) => {
      await addProgram(folder, "claude", replyingScript(folder))
      const listAgentModels = listerIn(folder)

      await Promise.all([listAgentModels("claude"), listAgentModels("claude")])
      await listAgentModels("claude")

      await expect(readFile(join(folder, "runs"), "utf8")).resolves.toBe("run\n")
    })
  })

  it("lists no models when the program fails, and asks again the next time", async () => {
    await withTemporaryFolder(async (folder) => {
      await addProgram(folder, "claude", "exit 1")
      const listAgentModels = listerIn(folder)

      await expect(listAgentModels("claude")).resolves.toStrictEqual([])

      await addProgram(folder, "claude", replyingScript(folder))

      await expect(listAgentModels("claude")).resolves.toHaveLength(1)
    })
  })

  it("lists no models for an agent whose program is missing, and for an agent it cannot ask", async () => {
    await withTemporaryFolder(async (folder) => {
      await addProgram(folder, "codex", replyingScript(folder))
      const listAgentModels = listerIn(folder)

      await expect(listAgentModels("claude")).resolves.toStrictEqual([])
      await expect(listAgentModels("codex")).resolves.toStrictEqual([])
    })
  })
})
