import { QueryClient } from "@tanstack/react-query"
import { createHashHistory } from "@tanstack/react-router"
import { createTRPCClient, unstable_localLink } from "@trpc/client"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { createDemoProcedureContext } from "@flightplan/backend/context"
import { demoReviewPathOf, type DemoReview } from "@flightplan/backend/demo-reviews"
import { appRouter, type AppRouter } from "@flightplan/backend/router"
import { createApp } from "@flightplan/frontend/app"
import { keepAnchorLinksOnPage } from "./anchor-links"
import { readDemos, readMount, type DemoMount } from "./demo-data"
import { createNoticeStore, DemoNotice, openNotice } from "./demo-notice"
import { afterDemoWriteLink } from "./demo-write-link"
import { keepForgeLinksInDemo } from "./forge-links"
import { keepHomeLinkOnSite } from "./home-link"
import { readShippedInstructionTexts } from "./instruction-texts"
import { jsonWireLink } from "./json-wire-link"
import "./demo.css"

const ROOT_ID = "demo-root"
const UNKNOWN_DEMO_MESSAGE = "This demo is not available."
const NOTICE_SWITCH_KEY = "flightplan-demo-notice"
const NOTICE_OFF = "off"

const isNoticeOff = (): boolean => {
  try {
    return window.localStorage.getItem(NOTICE_SWITCH_KEY) === NOTICE_OFF
  } catch {
    return false
  }
}

const ignoreWrite = (): void => undefined

const startingPathOf = (demos: readonly DemoReview[], mount: DemoMount): string | null => {
  const selected = demos.find((demo) => demo.name === mount.selectedName)
  return selected === undefined ? null : demoReviewPathOf(selected)
}

const openStartingPath = (path: string): void => {
  if (window.location.hash === "") window.location.replace(`#${path}`)
}

const mountDemo = async (element: HTMLElement): Promise<void> => {
  const mount = readMount(element)
  const demos = await readDemos(mount)
  const startingPath = startingPathOf(demos, mount)
  if (startingPath === null) throw new Error(UNKNOWN_DEMO_MESSAGE)
  openStartingPath(startingPath)
  keepForgeLinksInDemo(demos)
  keepAnchorLinksOnPage()
  keepHomeLinkOnSite()
  const isNoticeShown = !isNoticeOff()
  const noticeStore = createNoticeStore(isNoticeShown)
  const showNotice = (): void => {
    openNotice(noticeStore)
  }
  const context = await createDemoProcedureContext(demos, new Date(), () => crypto.randomUUID(), readShippedInstructionTexts)
  const trpcClient = createTRPCClient<AppRouter>({
    links: [jsonWireLink<AppRouter>(), afterDemoWriteLink<AppRouter>(isNoticeShown ? showNotice : ignoreWrite), unstable_localLink({ router: appRouter, createContext: async () => await Promise.resolve(context) })],
  })
  const app = createApp({ queryClient: new QueryClient(), trpcClient, history: createHashHistory() })
  createRoot(element).render(
    <StrictMode>
      {app}
      <DemoNotice store={noticeStore} />
    </StrictMode>,
  )
}

const FAILURE_PREFIX = "The demo could not start."

const showFailure = (element: HTMLElement, error: unknown): void => {
  const message = document.createElement("p")
  message.setAttribute("role", "alert")
  message.setAttribute("class", "p-6 text-foreground")
  message.append(`${FAILURE_PREFIX} ${error instanceof Error ? error.message : String(error)}`)
  element.replaceChildren(message)
}

const element = document.getElementById(ROOT_ID)
if (element === null) throw new Error(`Missing #${ROOT_ID} element in the demo page`)
mountDemo(element).catch((error: unknown) => {
  showFailure(element, error)
})
