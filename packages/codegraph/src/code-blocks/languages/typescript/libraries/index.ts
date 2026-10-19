import type { Library } from "@/code-blocks/libraries/types"
import { effectorLibrary } from "./effector"
import { expressLibrary } from "./express"
import { fastifyLibrary } from "./fastify"
import { mobxLibrary } from "./mobx"
import { nanostoresLibrary } from "./nanostores"
import { nestLibrary } from "./nestjs"
import { nextLibrary } from "./nextjs"
import { nodeCryptoLibrary } from "./node-crypto"
import { nodeEventsLibrary } from "./node-events"
import { nodeFsLibrary } from "./node-fs"
import { nodeChildProcessLibrary, nodeWorkerThreadsLibrary } from "./node-processes"
import { nodeUtilLibrary } from "./node-util"
import { piniaLibrary } from "./pinia"
import { reduxLibrary } from "./redux-toolkit"
import { rtkQueryLibrary } from "./rtk-query"
import { trpcLibrary } from "./trpc"
import { valtioLibrary } from "./valtio"
import { xstateLibrary } from "./xstate"
import { zustandLibrary } from "./zustand"

export const TYPESCRIPT_LIBRARIES: readonly Library[] = [
  effectorLibrary,
  expressLibrary,
  fastifyLibrary,
  mobxLibrary,
  nanostoresLibrary,
  nestLibrary,
  nextLibrary,
  nodeCryptoLibrary,
  nodeEventsLibrary,
  nodeFsLibrary,
  nodeUtilLibrary,
  nodeChildProcessLibrary,
  nodeWorkerThreadsLibrary,
  piniaLibrary,
  reduxLibrary,
  rtkQueryLibrary,
  trpcLibrary,
  valtioLibrary,
  xstateLibrary,
  zustandLibrary,
]
