import type { LibraryCardRules } from "@/journey-flow-diagram/cards/types"
import { expressCardRules } from "./libraries/express"
import { fastifyCardRules } from "./libraries/fastify"
import { nestCardRules } from "./libraries/nestjs"
import { nextCardRules } from "./libraries/nextjs"
import { piniaCardRules } from "./libraries/pinia"
import { reduxToolkitCardRules } from "./libraries/redux-toolkit"
import { rtkQueryCardRules } from "./libraries/rtk-query"
import { trpcCardRules } from "./libraries/trpc"
import { zustandCardRules } from "./libraries/zustand"

export const TYPESCRIPT_CARD_RULES: readonly LibraryCardRules[] = [
  expressCardRules,
  fastifyCardRules,
  nestCardRules,
  nextCardRules,
  piniaCardRules,
  reduxToolkitCardRules,
  rtkQueryCardRules,
  trpcCardRules,
  zustandCardRules,
]
