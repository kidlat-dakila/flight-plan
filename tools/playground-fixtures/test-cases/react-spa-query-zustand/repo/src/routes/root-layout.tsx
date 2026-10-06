import { Link, Outlet } from "react-router"
import { CartBadge } from "@/components/CartBadge"
import { useTheme } from "@/components/ThemeProvider"
import { Button } from "@/components/ui"

export function RootLayout() {
  const { theme, toggleTheme } = useTheme()
  return (
    <div data-theme={theme}>
      <header>
        <Link to="/">Catalogue</Link>
        <Link to="/account">Account</Link>
        <CartBadge />
        <Button variant="ghost" onClick={toggleTheme}>
          Switch theme
        </Button>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
