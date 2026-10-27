import Link from "next/link"
import type { ReactNode } from "react"
import { TRPCReactProvider } from "~/trpc/react"

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100">
        <nav className="flex gap-4 border-b border-slate-800 px-6 py-3">
          <Link href="/pokemon/new">New Pokemon</Link>
          <Link href="/trainers">Trainers</Link>
        </nav>
        <TRPCReactProvider>{children}</TRPCReactProvider>
      </body>
    </html>
  )
}
