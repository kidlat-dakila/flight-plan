import { join } from "node:path"
import { updateCheckSchema, type UpdateCheck } from "@/procedures/get-update-notice/utils/schemas"
import type { UpdateCheckFile } from "@/procedures/get-update-notice/utils/update-checker"
import { readTextOrNull, writeText } from "@/utils/text-file"

const FILE_NAME = "update-check.json"
const JSON_INDENT = 2

const parseUpdateCheck = (text: string | null): UpdateCheck | null => {
  if (text === null) return null
  try {
    const parsed = updateCheckSchema.safeParse(JSON.parse(text))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

const readNothing = (): null => null

const ignoreFailure = (): void => undefined

export const createUpdateCheckFile = (dataPath: string): UpdateCheckFile => {
  const filePath = join(dataPath, FILE_NAME)
  return {
    read: async () => parseUpdateCheck(await readTextOrNull(filePath).catch(readNothing)),
    write: async (check) => {
      await writeText(filePath, `${JSON.stringify(check, null, JSON_INDENT)}\n`).catch(ignoreFailure)
    },
  }
}
