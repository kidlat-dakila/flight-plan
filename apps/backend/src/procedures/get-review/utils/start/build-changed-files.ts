import type { ReviewTargetDetail } from "@/procedures/get-review/utils/review-artifact"
import type { LabelSegment } from "@/procedures/list-repositories/utils/schemas"
import { changedFilesLabelOf, summarizeFileKinds } from "./file-kinds"

const UNREAD_FILES_LABEL = "The changed files are not read yet"

const plain = (text: string): LabelSegment => ({ text, kind: "plain" })

export const buildChangedFiles = (detail: ReviewTargetDetail | null): LabelSegment[] =>
  detail === null
    ? [plain(UNREAD_FILES_LABEL)]
    : [changedFilesLabelOf(detail.changedPaths), ...summarizeFileKinds(detail.changedPaths)].map(plain)
