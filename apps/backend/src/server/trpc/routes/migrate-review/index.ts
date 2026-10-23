import { TRPCError } from "@trpc/server"
import { migrateReview } from "@/procedures/migrate-review"
import { migrateReviewInputSchema, reviewMigrationSchema } from "@/procedures/migrate-review/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

export const migrateReviewRoute = publicProcedure
  .input(migrateReviewInputSchema)
  .output(reviewMigrationSchema)
  .mutation(async ({ ctx, input }) => {
    const migration = await migrateReview(input, ctx)
    if (migration === null) {
      throw new TRPCError({ code: "NOT_FOUND", message: "This review target has no saved Flight Plan to update." })
    }
    return migration
  })
