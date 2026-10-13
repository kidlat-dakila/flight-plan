import type { ProcedureContext } from "@/procedures/context"
import { getPublishedReview } from "@/procedures/get-published-review"
import type { ReviewKey } from "@/procedures/get-review/utils/review-store"
import { formatPublishedPage } from "@/procedures/publish-artifact/utils/published-page"
import type { PublishedPageFiles } from "@/procedures/publish-artifact/utils/published-page-writer"

export type PublishedCopy
  = | { readonly kind: "written", readonly files: PublishedPageFiles, readonly hasImportLink: boolean }
    | { readonly kind: "missing" }
    | { readonly kind: "unbuilt" }

export const writePublishedCopy = async (key: ReviewKey, context: ProcedureContext): Promise<PublishedCopy> => {
  const [review, scaffold] = await Promise.all([getPublishedReview(key, context), context.reviewStore.readScaffold(key)])
  if (review === null) return { kind: "missing" }
  const files = await context.writePublishedPage(key, formatPublishedPage(review, scaffold))
  return files === null ? { kind: "unbuilt" } : { kind: "written", files, hasImportLink: review.importLink !== null }
}
