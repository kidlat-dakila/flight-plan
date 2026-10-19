import type { LibraryCardRules } from "@/journey-flow-diagram/cards/types"
import { effectorCardRules } from "./libraries/effector"
import { expressCardRules } from "./libraries/express"
import { fastifyCardRules } from "./libraries/fastify"
import { mobxCardRules } from "./libraries/mobx"
import { nanostoresCardRules } from "./libraries/nanostores"
import { nestCardRules } from "./libraries/nestjs"
import { nextCardRules } from "./libraries/nextjs"
import { piniaCardRules } from "./libraries/pinia"
import { reduxToolkitCardRules } from "./libraries/redux-toolkit"
import { rtkQueryCardRules } from "./libraries/rtk-query"
import { trpcCardRules } from "./libraries/trpc"
import { valtioCardRules } from "./libraries/valtio"
import { xstateCardRules } from "./libraries/xstate"
import { zustandCardRules } from "./libraries/zustand"

export const TYPESCRIPT_CARD_RULES: readonly LibraryCardRules[] = [
  effectorCardRules,
  expressCardRules,
  fastifyCardRules,
  mobxCardRules,
  nanostoresCardRules,
  nestCardRules,
  nextCardRules,
  piniaCardRules,
  reduxToolkitCardRules,
  rtkQueryCardRules,
  trpcCardRules,
  valtioCardRules,
  xstateCardRules,
  zustandCardRules,
]
