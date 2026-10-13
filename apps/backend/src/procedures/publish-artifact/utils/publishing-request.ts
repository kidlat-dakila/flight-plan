import type { ReviewKey } from "@/procedures/get-review/utils/review-store"
import type { PublishedPageFiles } from "./published-page-writer"

const PARAGRAPH_BREAK = "\n\n"
const ARTIFACT_ICON = "map"

const filesArgumentOf = (files: PublishedPageFiles): string =>
  JSON.stringify(files.supportingFileNames.map((fileName) => ({ path: fileName })))

const addressStep = (earlierUrl: string | null): string =>
  earlierUrl === null
    ? `This Flight Plan has not been published before, so pass no \`url\`, and pass \`icon\` "${ARTIFACT_ICON}".`
    : `This Flight Plan was published before: pass \`url\` "${earlierUrl}" so that artifact is updated in place. If the tool asks you to read that artifact first, read it, then publish these same files.`

export const publishingRequestOf = (key: ReviewKey, files: PublishedPageFiles, earlierUrl: string | null): string =>
  [
    "Publish this review target's Flight Plan as a Claude artifact.",
    `Flight Plan built the page in \`${files.folderPath}\`. It is finished: publish it as it is, and do not rewrite, restyle or redesign any of its files.`,
    [
      "1. The Artifact tool only takes files from your working directory or your scratchpad directory. Copy that folder into your scratchpad directory, never into the repository.",
      `2. Call the Artifact tool with \`file_path\` set to the copied \`${files.pageFileName}\`, \`root\` set to the copied folder, and \`files\` set to ${filesArgumentOf(files)}. ${addressStep(earlierUrl)}`,
      `3. Call record-publication with repositoryName "${key.repositoryName}", targetId "${key.targetId}" and the artifact's address from the tool's result.`,
      "4. Send the reviewer the address with send-message.",
    ].join("\n"),
    "If you have no Artifact tool, or publishing fails, do not publish it any other way. Tell the reviewer what went wrong with send-message.",
  ].join(PARAGRAPH_BREAK)
