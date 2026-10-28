import { Link, Outlet } from "react-router"

export function RootLayout() {
  return (
    <div>
      <header>
        <Link to="/">Trainers</Link>
        <Link to="/items">Items</Link>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
