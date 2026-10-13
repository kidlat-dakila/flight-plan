import type { LineColor } from "@/procedures/list-repositories/utils/line-color"
import type { Repository, ReviewTarget } from "@/procedures/list-repositories/utils/repository"
import type { ReviewArtifact } from "@flightplan/configurations"
import type { PullRequestReading } from "./pull-request-forge"
import type { ReviewTargetDetail } from "./review-target-detail"

export interface ReviewSubject {
  readonly repository: Repository
  readonly lineColor: LineColor
  readonly target: ReviewTarget
  readonly isOwn: boolean
  readonly artifact: ReviewArtifact | null
  readonly detail: ReviewTargetDetail | null
  readonly forge: PullRequestReading | null
  readonly notice: string | null
}
