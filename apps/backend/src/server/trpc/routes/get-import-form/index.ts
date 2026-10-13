import { getImportForm } from "@/procedures/get-import-form"
import { getImportFormInputSchema, importFormSchema } from "@/procedures/get-import-form/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

export const getImportFormRoute = publicProcedure
  .input(getImportFormInputSchema)
  .output(importFormSchema)
  .query(async ({ ctx, input }) => await getImportForm(input, ctx))
