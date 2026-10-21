import { createContext, useContext, useMemo, useState, type ReactNode } from "react"

const GUEST_NAME = "Guest"

interface SessionContextValue {
  professorName: string
  signOut: () => void
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [professorName, setProfessorName] = useState("Professor Oak")
  const value = useMemo(() => ({ professorName, signOut: () => setProfessorName(GUEST_NAME) }), [professorName])
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext)
  if (value === null) throw new Error("useSession must be used inside SessionProvider.")
  return value
}
