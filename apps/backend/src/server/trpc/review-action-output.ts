import { TRPCError } from "@trpc/server"
import type { ReviewActionResult } from "@/procedures/get-review/utils/review-action"

const NOT_FOUND_MESSAGE = "This pull request is no longer there."

export const toActionOutput = (result: ReviewActionResult | null): { message: string | null } => {
  if (result === null) throw new TRPCError({ code: "NOT_FOUND", message: NOT_FOUND_MESSAGE })
  if (result.kind === "refused") throw new TRPCError({ code: "BAD_REQUEST", message: result.message })
  return { message: null }
}
