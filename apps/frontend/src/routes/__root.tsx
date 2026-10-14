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
import { useColorTheme } from "@/color-theme"
import type { RouterContext } from "@/router-context"
import Button from "@flightplan/ui/blocks/button"
import BrandMark from "@flightplan/ui/BrandMark"
import { cn } from "@flightplan/ui/lib/utils"
import SettingsMenu, { type SettingsMenuLink } from "@flightplan/ui/SettingsMenu"
import SignBand from "@flightplan/ui/SignBand"

const LOGO_SRC = "/logo.svg"
const PRODUCT_NAME = "Flight Plan"
const SETUP_ROUTE_ID = "/setup/"
const SETTINGS_LINKS: readonly SettingsMenuLink[] = [
  { label: "Configure agents", icon: "agents", link: <Link to="/settings/agents" /> },
  { label: "Git integrations", icon: "forges", link: <Link to="/settings/forges" /> },
  { label: "Prompt configurations", icon: "configurations", link: <Link to="/settings/profiles" /> },
  { label: "Repositories", icon: "repositories", link: <Link to="/settings/repositories" /> },
]
const COLUMN_CLASSES = "mx-auto max-w-5xl px-4 pt-8 pb-16 sm:px-6"
const UNKNOWN_ERROR_MESSAGE = "The backend did not say what went wrong."
const NOT_FOUND_PICTURE_SRC = "/not-found.svg"
const START_ERROR_PICTURE_SRC = "/server-error.svg"
const PLANE_PICTURE_SIZE = 160

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
          {isSettingUp ? null : <SettingsMenu links={SETTINGS_LINKS} useThemeToggle={useColorTheme} />}
        </SignBand>
        <main className={cn("w-full", isFullWidth ? "" : COLUMN_CLASSES)}>
          <Outlet />
        </main>
      </div>
    </BandSlotContext>
  )
}

const PlanePicture = ({ src }: { readonly src: string }) => (
  <img src={src} alt="" width={PLANE_PICTURE_SIZE} height={PLANE_PICTURE_SIZE} className="size-40" />
)

const PageNotFound = () => (
  <section className="mx-auto flex max-w-prose flex-col items-center text-center">
    <PlanePicture src={NOT_FOUND_PICTURE_SRC} />
    <h1 className="mt-4 text-2xl font-bold tracking-[-0.01em]">PAN-PAN! We couldn't locate this page!</h1>
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
    <main role="alert" className="mx-auto flex min-h-screen max-w-prose flex-col items-center bg-background px-4 pt-16 text-center text-foreground">
      <PlanePicture src={START_ERROR_PICTURE_SRC} />
      <h1 className="mt-4 text-2xl font-bold tracking-[-0.01em]">MAYDAY! MAYDAY! Flight Plan could not start</h1>
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
