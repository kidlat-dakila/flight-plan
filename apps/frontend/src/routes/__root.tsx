import {
  createRootRouteWithContext,
  Link,
  Outlet,
  redirect,
  useMatches,
  type ErrorComponentProps,
} from "@tanstack/react-router"
import { useState, type ReactNode } from "react"
import { BandSlotContext } from "@/band-slot"
import { useColorTheme } from "@/color-theme"
import type { RouterContext } from "@/router-context"
import PlanePicture from "@/routes/-components/PlanePicture"
import ServerError from "@/routes/-components/ServerError"
import { useUpdateNotice } from "@/routes/-hooks/use-update-notice"
import { SETTINGS_LINKS } from "@/settings-links"
import { TroubleshootingContext, useTroubleshootingDialog, type TroubleshootingDialogState } from "@/troubleshooting"
import BrandMark from "@flightplan/ui/BrandMark"
import { cn } from "@flightplan/ui/lib/utils"
import SettingsMenu from "@flightplan/ui/SettingsMenu"
import SignBand from "@flightplan/ui/SignBand"
import TroubleshootButton from "@flightplan/ui/TroubleshootButton"
import TroubleshootDialog from "@flightplan/ui/TroubleshootDialog"
import UpdateToast from "@flightplan/ui/UpdateToast"

const LOGO_SRC = "/logo.svg"
const PRODUCT_NAME = "Flight Plan"
const SETUP_ROUTE_ID = "/setup/"
const COLUMN_CLASSES = "mx-auto max-w-5xl px-4 pt-8 pb-16 sm:px-6"
const NOT_FOUND_PICTURE_SRC = "/not-found.svg"
const NO_ERROR = { errorLogId: null, shownError: null }

interface TroubleshootingLayerProps {
  readonly troubleshooting: TroubleshootingDialogState
  readonly children: ReactNode
}

const TroubleshootingLayer = ({ troubleshooting, children }: TroubleshootingLayerProps) => (
  <TroubleshootingContext value={troubleshooting.open}>
    {children}
    {troubleshooting.dialog === null ? null : <TroubleshootDialog {...troubleshooting.dialog} />}
  </TroubleshootingContext>
)

const RootLayout = () => {
  const [bandSlot, setBandSlot] = useState<HTMLElement | null>(null)
  const isFullWidth = useMatches({ select: (matches) => matches.some((match) => match.staticData.isFullWidth === true) })
  const isSettingUp = useMatches({ select: (matches) => matches.some((match) => match.routeId === SETUP_ROUTE_ID) })
  const hasPageSettingsMenu = useMatches({ select: (matches) => matches.some((match) => match.staticData.hasPageSettingsMenu === true) })
  const update = useUpdateNotice()
  const colorTheme = useColorTheme()
  const troubleshooting = useTroubleshootingDialog()
  return (
    <TroubleshootingLayer troubleshooting={troubleshooting}>
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
            <div className="flex shrink-0 items-center gap-1">
              <TroubleshootButton onClick={() => { troubleshooting.open(NO_ERROR) }} />
              {isSettingUp || hasPageSettingsMenu ? null : <SettingsMenu links={SETTINGS_LINKS} themeToggle={colorTheme} />}
            </div>
          </SignBand>
          <main className={cn("w-full", isFullWidth ? "" : COLUMN_CLASSES)}>
            <Outlet />
          </main>
          {update.notice === null ? null : <UpdateToast notice={update.notice} isCopied={update.isCopied} onCopy={update.copy} onClose={update.close} />}
        </div>
      </BandSlotContext>
    </TroubleshootingLayer>
  )
}

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
  const troubleshooting = useTroubleshootingDialog()
  return (
    <TroubleshootingLayer troubleshooting={troubleshooting}>
      <main className="min-h-screen bg-background px-4 pt-16 text-foreground">
        <ServerError heading="MAYDAY! MAYDAY! Flight Plan could not start" error={error} />
      </main>
    </TroubleshootingLayer>
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
