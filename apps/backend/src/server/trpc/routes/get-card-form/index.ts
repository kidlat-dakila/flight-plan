import { TRPCError } from "@trpc/server"
import { getCardForm } from "@/procedures/get-card-form"
import { cardFormSchema, getCardFormInputSchema } from "@/procedures/get-card-form/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

const MISSING_CARD_MESSAGE = "This card is no longer on the diagram."

export const getCardFormRoute = publicProcedure
  .input(getCardFormInputSchema)
  .output(cardFormSchema)
  .query(async ({ ctx, input }) => {
    const form = await getCardForm(input, ctx)
    if (form === null) throw new TRPCError({ code: "NOT_FOUND", message: MISSING_CARD_MESSAGE })
    return form
  })
