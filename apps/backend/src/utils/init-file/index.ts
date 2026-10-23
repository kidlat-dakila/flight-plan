import { join } from "node:path"
import type { InitFile } from "@/procedures/run-migrations/utils/migration"
import { initRecordSchema, type InitRecord } from "@/procedures/run-migrations/utils/schemas"
import { readTextOrNull, writeText } from "@/utils/text-file"

const FILE_NAME = "init.json"
const JSON_INDENT = 2

const parseInitRecord = (text: string | null): InitRecord | null => {
  if (text === null) return null
  try {
    const parsed = initRecordSchema.safeParse(JSON.parse(text))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

export const createInitFile = (dataPath: string): InitFile => {
  const filePath = join(dataPath, FILE_NAME)
  return {
    read: async () => parseInitRecord(await readTextOrNull(filePath)),
    write: async (record) => {
      await writeText(filePath, `${JSON.stringify(record, null, JSON_INDENT)}\n`)
    },
  }
}
