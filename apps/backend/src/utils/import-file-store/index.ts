import { join } from "node:path"
import type { ReviewKey } from "@/procedures/get-review/utils/review-store"
import type { ImportFileStore } from "@/procedures/import-review/utils/import-file-store"
import { toFileName } from "@/utils/conversation-file-store"
import { readTextOrNull, removeFile } from "@/utils/text-file"

const IMPORTS_FOLDER_NAME = "imports"
const FILE_EXTENSION = ".json"

export const createImportFileStore = (dataPath: string): ImportFileStore => {
  const pathOf = (key: ReviewKey): string =>
    join(dataPath, IMPORTS_FOLDER_NAME, toFileName(key.repositoryName), `${toFileName(key.targetId)}${FILE_EXTENSION}`)
  return {
    pathOf,
    read: async (key) => await readTextOrNull(pathOf(key)),
    remove: async (key) => {
      await removeFile(pathOf(key))
    },
  }
}
