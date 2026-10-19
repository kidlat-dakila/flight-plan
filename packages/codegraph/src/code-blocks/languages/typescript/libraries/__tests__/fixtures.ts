import type { PatternFixture } from "@/catalogue/types"
import { effectorFixtures } from "./effector-fixtures"
import { expressFixtures } from "./express-fixtures"
import { fastifyFixtures } from "./fastify-fixtures"
import { mobxFixtures } from "./mobx-fixtures"
import { nanostoresFixtures } from "./nanostores-fixtures"
import { nestFixtures } from "./nestjs-fixtures"
import { nextFixtures } from "./nextjs-fixtures"
import { nodeCryptoFixtures } from "./node-crypto-fixtures"
import { nodeEventsFixtures } from "./node-events-fixtures"
import { nodeFsFixtures } from "./node-fs-fixtures"
import { nodeChildProcessFixtures, nodeWorkerThreadsFixtures } from "./node-processes-fixtures"
import { nodeUtilFixtures } from "./node-util-fixtures"
import { piniaFixtures } from "./pinia-fixtures"
import { reduxFixtures } from "./redux-toolkit-fixtures"
import { rtkQueryFixtures } from "./rtk-query-fixtures"
import { trpcFixtures } from "./trpc-fixtures"
import { valtioFixtures } from "./valtio-fixtures"
import { xstateFixtures } from "./xstate-fixtures"
import { zustandFixtures } from "./zustand-fixtures"

export const TYPESCRIPT_LIBRARY_FIXTURES: readonly PatternFixture[] = [
  ...effectorFixtures,
  ...expressFixtures,
  ...fastifyFixtures,
  ...mobxFixtures,
  ...nanostoresFixtures,
  ...nestFixtures,
  ...nextFixtures,
  ...nodeCryptoFixtures,
  ...nodeEventsFixtures,
  ...nodeFsFixtures,
  ...nodeUtilFixtures,
  ...nodeChildProcessFixtures,
  ...nodeWorkerThreadsFixtures,
  ...piniaFixtures,
  ...reduxFixtures,
  ...rtkQueryFixtures,
  ...trpcFixtures,
  ...valtioFixtures,
  ...xstateFixtures,
  ...zustandFixtures,
]
