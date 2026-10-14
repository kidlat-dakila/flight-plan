import { join } from "node:path"
import { z } from "zod"
import { readTextOrNull, writeText } from "@/utils/text-file"

const FILE_NAME = "server.json"
const JSON_INDENT = 2

const savedPortSchema = z.object({ port: z.number().int().positive() })

export interface SavedPortFile {
  readonly read: () => Promise<number | null>
  readonly write: (port: number) => Promise<void>
}

const parseSavedPort = (text: string | null): number | null => {
  if (text === null) return null
  try {
    const parsed = savedPortSchema.safeParse(JSON.parse(text))
    return parsed.success ? parsed.data.port : null
  } catch {
    return null
  }
}

export const createSavedPortFile = (dataPath: string): SavedPortFile => {
  const filePath = join(dataPath, FILE_NAME)
  return {
    read: async () => parseSavedPort(await readTextOrNull(filePath)),
    write: async (port) => {
      await writeText(filePath, `${JSON.stringify({ port }, null, JSON_INDENT)}\n`)
    },
  }
}
