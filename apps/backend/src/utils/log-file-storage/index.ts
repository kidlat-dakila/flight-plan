import { join } from "node:path"
import type { LogStorage } from "@/procedures/record-error/utils/error-log"
import { isLogId } from "@/procedures/record-error/utils/log-id"
import { logEntrySchema, type LogEntry } from "@/procedures/record-error/utils/schemas"
import { readFolderNames } from "@/utils/conversation-file-store"
import { readTextOrNull, removeFile, writeText } from "@/utils/text-file"

const LOGS_FOLDER_NAME = "logs"
const FILE_EXTENSION = ".json"
const JSON_INDENT = 2

const formatEntry = (entry: LogEntry): string => `${JSON.stringify(entry, null, JSON_INDENT)}\n`

const parseEntry = (text: string | null): LogEntry | null => {
  if (text === null) return null
  try {
    const parsed = logEntrySchema.safeParse(JSON.parse(text))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

const readNothing = (): null => null

const idOfFileName = (fileName: string): string | null => {
  if (!fileName.endsWith(FILE_EXTENSION)) return null
  const id = fileName.slice(0, -FILE_EXTENSION.length)
  return isLogId(id) ? id : null
}

export const logsFolderOf = (dataPath: string): string => join(dataPath, LOGS_FOLDER_NAME)

export const createLogFileStorage = (dataPath: string): LogStorage => {
  const folderPath = logsFolderOf(dataPath)
  const pathOf = (id: string): string => join(folderPath, `${id}${FILE_EXTENSION}`)
  return {
    folderPath,
    write: async (entry) => {
      await writeText(pathOf(entry.id), formatEntry(entry))
    },
    read: async (id) => (isLogId(id) ? parseEntry(await readTextOrNull(pathOf(id)).catch(readNothing)) : null),
    listIds: async () => (await readFolderNames(folderPath)).flatMap((fileName) => idOfFileName(fileName) ?? []),
    remove: async (ids) => {
      await Promise.all(ids.filter(isLogId).map(async (id) => {
        await removeFile(pathOf(id))
      }))
    },
  }
}
