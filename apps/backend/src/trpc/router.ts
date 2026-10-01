import { addRepositoryProcedure } from "./add-repository"
import { dismissNewTargetProcedure } from "./dismiss-new-target"
import { healthProcedure } from "./health"
import { listRepositoriesProcedure } from "./list-repositories"
import { createRouter } from "./procedures"

export const appRouter = createRouter({
  health: healthProcedure,
  repository: createRouter({
    list: listRepositoriesProcedure,
    dismissNewTarget: dismissNewTargetProcedure,
    add: addRepositoryProcedure,
  }),
})

export type AppRouter = typeof appRouter
