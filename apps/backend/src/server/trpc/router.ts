import { addRepositoryRoute } from "./routes/add-repository"
import { dismissNewTargetRoute } from "./routes/dismiss-new-target"
import { healthRoute } from "./routes/health"
import { listRepositoriesRoute } from "./routes/list-repositories"
import { createRouter } from "./trpc"

export const appRouter = createRouter({
  health: healthRoute,
  repository: createRouter({
    list: listRepositoriesRoute,
    dismissNewTarget: dismissNewTargetRoute,
    add: addRepositoryRoute,
  }),
})

export type AppRouter = typeof appRouter
