import { copyFile, mkdir } from "node:fs/promises"
import { join } from "node:path"
import { FLIGHT_PLAN_FILE_NAME, PAGE_FILE_NAME, REVIEW_SCRIPT_FILE_NAME } from "@/procedures/publish-artifact/utils/published-page"
import type { PublishedPageWriter } from "@/procedures/publish-artifact/utils/published-page-writer"
import { readFolderNames, toFileName } from "@/utils/conversation-file-store"
import { removeFile, writeText } from "@/utils/text-file"

export interface PublishedPageWriterOptions {
  readonly bundlePath: string
  readonly dataPath: string
}

const PUBLICATIONS_FOLDER_NAME = "publications"

export const createPublishedPageWriter = ({ bundlePath, dataPath }: PublishedPageWriterOptions): PublishedPageWriter =>
  async (key, texts) => {
    const bundleFileNames = await readFolderNames(bundlePath)
    if (bundleFileNames.length === 0) return null
    const folderPath = join(dataPath, PUBLICATIONS_FOLDER_NAME, toFileName(key.repositoryName), toFileName(key.targetId))
    await mkdir(folderPath, { recursive: true })
    await Promise.all([
      ...bundleFileNames.map(async (fileName) => { await copyFile(join(bundlePath, fileName), join(folderPath, fileName)) }),
      writeText(join(folderPath, PAGE_FILE_NAME), texts.html),
      writeText(join(folderPath, REVIEW_SCRIPT_FILE_NAME), texts.reviewScript),
      texts.flightPlanFile === null
        ? removeFile(join(folderPath, FLIGHT_PLAN_FILE_NAME))
        : writeText(join(folderPath, FLIGHT_PLAN_FILE_NAME), texts.flightPlanFile),
    ])
    return {
      folderPath,
      pageFileName: PAGE_FILE_NAME,
      supportingFileNames: [...bundleFileNames, REVIEW_SCRIPT_FILE_NAME, ...(texts.flightPlanFile === null ? [] : [FLIGHT_PLAN_FILE_NAME])],
    }
  }
