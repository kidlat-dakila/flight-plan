import { createRouter, type RouterHistory } from "@tanstack/react-router"
import type { RouterContext } from "./router-context"
import { routeTree } from "./routeTree.gen"

export const createAppRouter = (context: RouterContext, history?: RouterHistory) =>
  createRouter({
    routeTree,
    context,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    ...(history === undefined ? {} : { history }),
  })

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }

  interface StaticDataRouteOption {
    isFullWidth?: boolean
    hasPageSettingsMenu?: boolean
  }
}
