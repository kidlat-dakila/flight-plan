import { Link, Outlet } from "react-router"
import { useSession } from "@/components/SessionProvider"
import { Button } from "@/components/ui"

export function RootLayout() {
  const { staffName, signOut } = useSession()
  return (
    <div>
      <header>
        <Link to="/">Customers</Link>
        <Link to="/products">Products</Link>
        <Link to="/help">Help</Link>
        <span>{staffName}</span>
        <Button variant="ghost" onClick={signOut}>
          Sign out
        </Button>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
