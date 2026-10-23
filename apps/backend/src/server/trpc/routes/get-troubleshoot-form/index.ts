import { getTroubleshootForm } from "@/procedures/get-troubleshoot-form"
import { troubleshootFormSchema, troubleshootSubjectSchema } from "@/procedures/get-troubleshoot-form/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

export const getTroubleshootFormRoute = publicProcedure
  .input(troubleshootSubjectSchema)
  .output(troubleshootFormSchema)
  .query(async ({ ctx, input }) => await getTroubleshootForm(input, ctx))
