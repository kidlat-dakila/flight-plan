import type { Library } from "@/code-blocks/libraries/types"
import { expressLibrary } from "./express"
import { fastifyLibrary } from "./fastify"
import { nestLibrary } from "./nestjs"
import { nextLibrary } from "./nextjs"
import { piniaLibrary } from "./pinia"
import { reduxLibrary } from "./redux-toolkit"
import { rtkQueryLibrary } from "./rtk-query"
import { trpcLibrary } from "./trpc"
import { zustandLibrary } from "./zustand"

export const TYPESCRIPT_LIBRARIES: readonly Library[] = [expressLibrary, fastifyLibrary, nestLibrary, nextLibrary, piniaLibrary, reduxLibrary, rtkQueryLibrary, trpcLibrary, zustandLibrary]
