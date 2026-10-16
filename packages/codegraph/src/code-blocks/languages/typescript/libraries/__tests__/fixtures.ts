import type { PatternFixture } from "@/catalogue/types"
import { expressFixtures } from "./express-fixtures"
import { fastifyFixtures } from "./fastify-fixtures"
import { nestFixtures } from "./nestjs-fixtures"
import { nextFixtures } from "./nextjs-fixtures"
import { piniaFixtures } from "./pinia-fixtures"
import { reduxFixtures } from "./redux-toolkit-fixtures"
import { rtkQueryFixtures } from "./rtk-query-fixtures"
import { trpcFixtures } from "./trpc-fixtures"
import { zustandFixtures } from "./zustand-fixtures"

export const TYPESCRIPT_LIBRARY_FIXTURES: readonly PatternFixture[] = [
  ...expressFixtures,
  ...fastifyFixtures,
  ...nestFixtures,
  ...nextFixtures,
  ...piniaFixtures,
  ...reduxFixtures,
  ...rtkQueryFixtures,
  ...trpcFixtures,
  ...zustandFixtures,
]
