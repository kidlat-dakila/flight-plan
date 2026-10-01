import { createRootRouteWithContext, Link, Outlet } from "@tanstack/react-router"
import BrandMark from "@flightplan/ui/BrandMark"
import SignBand from "@flightplan/ui/SignBand"
import type { RouterContext } from "@/router-context"

const LOGO_SRC = "/logo-small.png"
const PRODUCT_NAME = "Flight Plan"

const RootLayout = () => (
  <div className="min-h-screen bg-background text-foreground">
    <SignBand
      brand={(
        <Link to="/" className="rounded-sm">
          <BrandMark logoSrc={LOGO_SRC} name={PRODUCT_NAME} />
        </Link>
      )}
    />
    <main className="mx-auto w-full max-w-5xl px-4 pt-8 pb-16 sm:px-6">
      <Outlet />
    </main>
  </div>
)

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
