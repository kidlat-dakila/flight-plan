import type { ReviewKey } from "@/procedures/get-review/utils/review-store"
import { FLIGHT_PLAN_FILE_NAME } from "@/procedures/publish-artifact/utils/published-page"

const PARAGRAPH_BREAK = "\n\n"

export const fetchingRequestOf = (key: ReviewKey, artifactUrl: string, destinationPath: string): string =>
  [
    "Fetch a Flight Plan from a Claude artifact, so the reviewer can read it in Flight Plan.",
    [
      `1. Call the Artifact tool with \`action\` "read", \`url\` "${artifactUrl}" and \`path\` "${FLIGHT_PLAN_FILE_NAME}". It saves the file and says where.`,
      `2. Copy that file, unchanged, to \`${destinationPath}\`. Create the folder when it is missing.`,
      `3. Call record-import with repositoryName "${key.repositoryName}" and targetId "${key.targetId}".`,
      "4. Tell the reviewer with send-message that the Flight Plan is imported.",
    ].join("\n"),
    "If you have no Artifact tool, the artifact cannot be opened or it holds no such file, do not look for the Flight Plan anywhere else. Tell the reviewer what went wrong with send-message.",
  ].join(PARAGRAPH_BREAK)
