import { Link, Outlet } from "react-router"
import { useSession } from "@/components/SessionProvider"
import { Button } from "@/components/ui"

export function RootLayout() {
  const { professorName, signOut } = useSession()
  return (
    <div>
      <header>
        <Link to="/">Trainers</Link>
        <Link to="/items">Items</Link>
        <Link to="/help">Help</Link>
        <span>{professorName}</span>
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
