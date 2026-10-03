import { getAuthorForm } from "@/procedures/get-author-form"
import { authorFormSchema, getAuthorFormInputSchema } from "@/procedures/get-author-form/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

export const getAuthorFormRoute = publicProcedure
  .input(getAuthorFormInputSchema)
  .output(authorFormSchema)
  .query(async ({ ctx, input }) => await getAuthorForm(input, ctx))
