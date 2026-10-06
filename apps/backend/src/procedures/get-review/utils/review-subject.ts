import type { LineColor } from "@/procedures/list-repositories/utils/line-color"
import type { Repository, ReviewTarget } from "@/procedures/list-repositories/utils/repository"
import type { ReviewArtifact } from "@flightplan/configurations"
import type { ReviewTargetDetail } from "./review-target-detail"

export interface ReviewSubject {
  readonly repository: Repository
  readonly lineColor: LineColor
  readonly target: ReviewTarget
  readonly artifact: ReviewArtifact | null
  readonly detail: ReviewTargetDetail | null
  readonly notice: string | null
}
