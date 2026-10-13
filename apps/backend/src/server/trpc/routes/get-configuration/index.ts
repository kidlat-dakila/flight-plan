import { TRPCError } from "@trpc/server"
import { getConfiguration } from "@/procedures/get-configuration"
import { configurationPageSchema, getConfigurationInputSchema } from "@/procedures/get-configuration/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

const foundPageSchema = configurationPageSchema.options[0]

export const getConfigurationRoute = publicProcedure
  .input(getConfigurationInputSchema)
  .output(foundPageSchema)
  .query(async ({ ctx, input }) => {
    const page = await getConfiguration(input, ctx)
    if (page.kind === "missing") throw new TRPCError({ code: "NOT_FOUND", message: page.message })
    return page
  })
