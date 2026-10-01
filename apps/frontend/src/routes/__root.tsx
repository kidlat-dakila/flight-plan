import { createRootRouteWithContext, Link, Outlet, useMatches } from "@tanstack/react-router"
import { useState } from "react"
import BrandMark from "@flightplan/ui/BrandMark"
import { cn } from "@flightplan/ui/lib/utils"
import SignBand from "@flightplan/ui/SignBand"
import { BandSlotContext } from "@/band-slot"
import type { RouterContext } from "@/router-context"

const LOGO_SRC = "/logo-small.png"
const PRODUCT_NAME = "Flight Plan"
const COLUMN_CLASSES = "mx-auto max-w-5xl px-4 pt-8 pb-16 sm:px-6"

const RootLayout = () => {
  const [bandSlot, setBandSlot] = useState<HTMLElement | null>(null)
  const isFullWidth = useMatches({ select: (matches) => matches.some((match) => match.staticData.isFullWidth === true) })
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

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: PageNotFound,
})
