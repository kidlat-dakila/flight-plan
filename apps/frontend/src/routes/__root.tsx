import { createRootRoute, Link, Outlet } from "@tanstack/react-router"

const RootLayout = () => (
  <div className="min-h-screen bg-background text-foreground">
    <header className="flex items-center gap-4 border-b px-6 py-3">
      <span className="font-semibold">Flight Plan</span>
      <nav className="flex gap-3 text-sm text-muted-foreground">
        <Link to="/" className="[&.active]:text-foreground">Home</Link>
      </nav>
    </header>
    <main className="p-6">
      <Outlet />
    </main>
  </div>
)

export const Route = createRootRoute({ component: RootLayout })
