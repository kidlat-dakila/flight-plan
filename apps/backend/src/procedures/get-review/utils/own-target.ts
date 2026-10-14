import { normalizeLogin } from "@/procedures/list-repositories/utils/build-review-targets"
import type { ReviewTarget } from "@/procedures/list-repositories/utils/repository"

export interface OwnershipFacts {
  readonly viewerLogin: string | null
  readonly selfAuthorId: string | null
  readonly branchAuthorEmail: string | null
}

const isOwnBranch = ({ selfAuthorId, branchAuthorEmail }: OwnershipFacts): boolean =>
  selfAuthorId === null || branchAuthorEmail === null || selfAuthorId.toLowerCase() === branchAuthorEmail

export const isOwnTarget = (target: ReviewTarget, facts: OwnershipFacts): boolean =>
  target.kind === "branch"
    ? isOwnBranch(facts)
    : facts.viewerLogin !== null && normalizeLogin(target.author) === normalizeLogin(facts.viewerLogin)
