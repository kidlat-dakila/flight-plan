import { normalizeLogin } from "@/procedures/list-repositories/utils/build-review-targets"
import type { ReviewTarget } from "@/procedures/list-repositories/utils/repository"

export const isOwnTarget = (target: ReviewTarget, viewerLogin: string | null): boolean =>
  target.kind === "branch"
  || (viewerLogin !== null && normalizeLogin(target.author) === normalizeLogin(viewerLogin))
