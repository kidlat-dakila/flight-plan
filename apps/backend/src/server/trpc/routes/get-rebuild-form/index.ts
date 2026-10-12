import { TRPCError } from "@trpc/server"
import { getRebuildForm } from "@/procedures/get-rebuild-form"
import { getRebuildFormInputSchema, rebuildFormSchema } from "@/procedures/get-rebuild-form/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

export const getRebuildFormRoute = publicProcedure
  .input(getRebuildFormInputSchema)
  .output(rebuildFormSchema)
  .query(async ({ ctx, input }) => {
    const form = await getRebuildForm(input, ctx)
    if (form === null) {
      throw new TRPCError({ code: "NOT_FOUND", message: "This review target has no review artifact to build again." })
    }
    return form
  })
