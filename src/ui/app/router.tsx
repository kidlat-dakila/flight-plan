import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
  type RouterHistory,
} from "@tanstack/react-router"
import { useLayoutEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { planRefOf } from "./ids"
import { themeQuery } from "./api"
import { applyVariables, themeVariables } from "../theme/colors"
import { DEFAULT_THEME } from "../highlight"
import { ReviewPage } from "./ReviewPage"
import { SetupPage } from "./SetupPage"
import { useShell } from "./shell"
import type { SampleQuery } from "./api"

/**
 * The UI's routes.
 *
 * - `/setup`
 * - `/review-flight-plan/{kind}/{owner}/{repo}/{name}`: a stored document.
 * - `/review-flight-plan/sample`, `/review-flight-plan/sample/{name}`: the
 *   samples, with `?step`, `?stale`, `?bare` for the states a sample shows.
 *
 * The browser uses its own history; the webview gets a memory history (its
 * document URL is fixed), started at the route the extension names.
 *
 * An id is one URL-encoded segment per id segment (`idPath` in
 * `src/api/api/protocol.ts`): a branch walkthrough's name holds `%2F`, which
 * travels as `%252F`. The router decodes a path once, so the splat below is
 * the id as the API expects it.
 */

/**
 * The root: every page, under the user's VS Code theme.
 *
 * The defaults apply at once, so nothing renders uncoloured while the theme
 * is read; the selected theme replaces them when it arrives, and the defaults
 * stay behind every key it leaves out. In the webview VS Code sets the
 * variables itself, from the theme it is showing, so nothing is applied there.
 */
function Root() {
  const { appliesTheme } = useShell()
  const theme = useQuery({ ...themeQuery(), enabled: appliesTheme })
  const selected = theme.data ?? DEFAULT_THEME
  useLayoutEffect(() => {
    if (appliesTheme) applyVariables(window.document.documentElement, themeVariables(selected))
  }, [appliesTheme, selected])
  return <Outlet />
}

const root = createRootRoute({ component: Root })

const index = createRoute({
  getParentRoute: () => root,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/review-flight-plan/sample" })
  },
})

const setup = createRoute({
  getParentRoute: () => root,
  path: "/setup",
  // `state`, not `sample`: `?sample=` is the old harness address, which the
  // entry rewrites to a review sample (`legacySampleUrl`).
  validateSearch: (search: Record<string, unknown>): { state?: string } =>
    typeof search["state"] === "string" ? { state: search["state"] } : {},
  component: function Setup() {
    return <SetupPage sample={setup.useSearch().state ?? ""} />
  },
})

function sampleSearch(search: Record<string, unknown>): SampleQuery {
  const out: SampleQuery = {}
  const step = Number(search["step"])
  if (search["step"] !== undefined && Number.isInteger(step)) out.step = step
  if (search["stale"] !== undefined) out.stale = search["stale"] === true ? "" : String(search["stale"])
  if (search["bare"] !== undefined) out.bare = true
  return out
}

function SamplePage({ name, search }: { name: string; search: SampleQuery }) {
  const id = name === "walkthrough" ? "sample" : `sample/${name}`
  // Samples are not in storage, so nothing names them for a tool.
  return <ReviewPage id={id} query={search} planRef={`sample/${name}`} toolHint="" />
}

const sample = createRoute({
  getParentRoute: () => root,
  path: "/review-flight-plan/sample",
  validateSearch: sampleSearch,
  component: function Sample() {
    return <SamplePage name="walkthrough" search={sample.useSearch()} />
  },
})

const sampleNamed = createRoute({
  getParentRoute: () => root,
  path: "/review-flight-plan/sample/$name",
  validateSearch: sampleSearch,
  component: function SampleNamed() {
    const { name } = sampleNamed.useParams()
    return <SamplePage name={name} search={sampleNamed.useSearch()} />
  },
})

const stored = createRoute({
  getParentRoute: () => root,
  path: "/review-flight-plan/$",
  component: function Stored() {
    const { _splat } = stored.useParams()
    const id = _splat ?? ""
    return <ReviewPage id={id} query={{}} planRef={planRefOf(id)} toolHint="read" />
  },
})

const tree = root.addChildren([index, setup, sample, sampleNamed, stored])

export function createAppRouter(history?: RouterHistory) {
  return createRouter({ routeTree: tree, ...(history === undefined ? {} : { history }) })
}

/** For the webview, where the document URL is fixed. */
export function memoryRouter(start: string) {
  return createAppRouter(createMemoryHistory({ initialEntries: [start] }))
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
}
