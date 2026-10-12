import { TRPCError } from "@trpc/server"
import { getCreationForm } from "@/procedures/get-creation-form"
import { creationFormSchema, getCreationFormInputSchema } from "@/procedures/get-creation-form/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

const MISSING_REPOSITORY_MESSAGE = "This repository is no longer listed."

export const getCreationFormRoute = publicProcedure
  .input(getCreationFormInputSchema)
  .output(creationFormSchema)
  .query(async ({ ctx, input }) => {
    const form = await getCreationForm(input, ctx)
    if (form === null) throw new TRPCError({ code: "NOT_FOUND", message: MISSING_REPOSITORY_MESSAGE })
    return form
  })
