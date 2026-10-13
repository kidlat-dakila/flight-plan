import type { ReviewKey } from "@/procedures/get-review/utils/review-store"
import {
  APP_SCRIPT_FILE_NAME,
  APP_STYLE_FILE_NAME,
  FLIGHT_PLAN_FILE_NAME,
  PAGE_FILE_NAME,
  REVIEW_SCRIPT_FILE_NAME,
  type PublishedPageTexts,
} from "./published-page"

export interface PublishedPageFiles {
  readonly folderPath: string
  readonly pageFileName: string
  readonly supportingFileNames: readonly string[]
}

export type PublishedPageWriter = (key: ReviewKey, texts: PublishedPageTexts) => Promise<PublishedPageFiles | null>

const SAMPLE_FOLDER_PATH = "/sample-publications"

export const writeSamplePublishedPage: PublishedPageWriter = async (key, texts) =>
  await Promise.resolve({
    folderPath: `${SAMPLE_FOLDER_PATH}/${key.repositoryName}/${key.targetId}`,
    pageFileName: PAGE_FILE_NAME,
    supportingFileNames: [
      APP_SCRIPT_FILE_NAME,
      APP_STYLE_FILE_NAME,
      REVIEW_SCRIPT_FILE_NAME,
      ...(texts.flightPlanFile === null ? [] : [FLIGHT_PLAN_FILE_NAME]),
    ],
  })
