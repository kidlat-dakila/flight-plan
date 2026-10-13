import {
  createRootRouteWithContext,
  Link,
  Outlet,
  redirect,
  useMatches,
  useRouter,
  type ErrorComponentProps,
} from "@tanstack/react-router"
import { useState } from "react"
import { BandSlotContext } from "@/band-slot"
import type { RouterContext } from "@/router-context"
import Button from "@flightplan/ui/blocks/button"
import BrandMark from "@flightplan/ui/BrandMark"
import { cn } from "@flightplan/ui/lib/utils"
import SignBand from "@flightplan/ui/SignBand"

const LOGO_SRC = "/logo-small.png"
const PRODUCT_NAME = "Flight Plan"
const SETTINGS_LABEL = "Settings"
const SETUP_ROUTE_ID = "/setup/"
const COLUMN_CLASSES = "mx-auto max-w-5xl px-4 pt-8 pb-16 sm:px-6"
const UNKNOWN_ERROR_MESSAGE = "The backend did not say what went wrong."

const RootLayout = () => {
  const [bandSlot, setBandSlot] = useState<HTMLElement | null>(null)
  const isFullWidth = useMatches({ select: (matches) => matches.some((match) => match.staticData.isFullWidth === true) })
  const isSettingUp = useMatches({ select: (matches) => matches.some((match) => match.routeId === SETUP_ROUTE_ID) })
  return (
    <BandSlotContext value={bandSlot}>
      <div className="min-h-screen bg-background text-foreground">
        <SignBand
          width={isFullWidth ? "full" : "column"}
          brand={(
            <Link to="/" className="shrink-0 rounded-sm">
              <BrandMark logoSrc={LOGO_SRC} name={PRODUCT_NAME} />
            </Link>
          )}
        >
          <div ref={setBandSlot} className="flex min-w-0 flex-1 items-center border-l border-sign-foreground/20 pl-6 empty:hidden" />
          {isSettingUp
            ? null
            : (
                <Link to="/settings" className="shrink-0 rounded-sm text-sm text-sign-muted hover:text-sign-foreground">
                  {SETTINGS_LABEL}
                </Link>
              )}
        </SignBand>
        <main className={cn("w-full", isFullWidth ? "" : COLUMN_CLASSES)}>
          <Outlet />
        </main>
      </div>
    </BandSlotContext>
  )
}

const PageNotFound = () => (
  <section className="max-w-prose">
    <h1 className="text-2xl font-bold tracking-[-0.01em]">This page does not exist</h1>
    <p className="mt-2 text-muted-foreground">
      The address does not match any page of Flight Plan.
    </p>
    <Link to="/" className="mt-4 inline-block underline">
      Go to your repositories
    </Link>
  </section>
)

const StartError = ({ error }: ErrorComponentProps) => {
  const router = useRouter()
  return (
    <main role="alert" className="mx-auto min-h-screen max-w-prose bg-background px-4 pt-16 text-foreground">
      <h1 className="text-2xl font-bold tracking-[-0.01em]">Flight Plan could not start</h1>
      <p className="mt-2 text-muted-foreground">{error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE}</p>
      <Button className="mt-4" onClick={() => { void router.invalidate() }}>Try again</Button>
    </main>
  )
}

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: async ({ context: { queryClient, trpc }, location }) => {
    const gate = await queryClient.query({
      ...trpc.setup.gate.queryOptions({ path: location.pathname }),
      staleTime: "static",
    })
    if (gate.redirectTo !== null) redirect({ to: gate.redirectTo, throw: true })
  },
  component: RootLayout,
  notFoundComponent: PageNotFound,
  errorComponent: StartError,
})
