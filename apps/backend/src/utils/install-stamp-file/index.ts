import { join } from "node:path"
import { z } from "zod"
import type { AgentName } from "@/procedures/get-setup/utils/setup"
import type { InstallStamp } from "@/procedures/refresh-agent-installs/utils/install-fingerprint"
import { readTextOrNull, writeText } from "@/utils/text-file"

const FOLDER_NAME = "agent-installs"
const JSON_INDENT = 2

const installStampSchema = z.object({ installPath: z.string(), fingerprint: z.string() })

export interface InstallStampFile {
  readonly read: (agent: AgentName) => Promise<InstallStamp | null>
  readonly write: (agent: AgentName, stamp: InstallStamp) => Promise<void>
}

const parseInstallStamp = (text: string | null): InstallStamp | null => {
  if (text === null) return null
  try {
    const parsed = installStampSchema.safeParse(JSON.parse(text))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

export const createInstallStampFile = (dataPath: string): InstallStampFile => {
  const pathOf = (agent: AgentName): string => join(dataPath, FOLDER_NAME, `${agent}.json`)
  return {
    read: async (agent) => parseInstallStamp(await readTextOrNull(pathOf(agent))),
    write: async (agent, stamp) => {
      await writeText(pathOf(agent), `${JSON.stringify(stamp, null, JSON_INDENT)}\n`)
    },
  }
}
