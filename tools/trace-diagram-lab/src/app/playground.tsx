import { useQuery } from "@tanstack/react-query"
import { useEffect } from "react"
import PlaygroundCase from "./playground-case"
import PlaygroundNav from "./playground-nav"
import { chosenPlaygroundOf, playgroundRouteOf, redirectPathOf } from "./playground-path"
import { playgroundPageQueryOf, playgroundsQuery } from "./playground-requests"
import type { PlaygroundEntry } from "./playground-schemas"
import { playgroundStatusOf } from "./playground-status"

interface PlaygroundProps {
  readonly pathname: string
  readonly onNavigate: (path: string) => void
  readonly onRedirect: (path: string) => void
}

const NO_PLAYGROUNDS: readonly PlaygroundEntry[] = []

const Playground = ({ pathname, onNavigate, onRedirect }: PlaygroundProps) => {
  const playgrounds = useQuery(playgroundsQuery)
  const entries = playgrounds.data ?? NO_PLAYGROUNDS
  const chosen = chosenPlaygroundOf(entries, playgroundRouteOf(pathname))
  const redirectPath = redirectPathOf(pathname, chosen)
  const playgroundPage = useQuery(playgroundPageQueryOf(chosen?.id ?? null))
  const shown = playgroundPage.data ?? null
  const statusMessage = playgroundStatusOf({
    list: { isLoading: playgrounds.isLoading, error: playgrounds.error },
    listCount: playgrounds.data?.length ?? null,
    page: { isLoading: playgroundPage.isLoading, error: playgroundPage.error },
    segmentCount: shown === null ? null : shown.cases.reduce((count, playgroundCase) => count + playgroundCase.page.segments.length, 0),
  })
  useEffect(() => {
    if (redirectPath !== null) onRedirect(redirectPath)
  }, [redirectPath, onRedirect])
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PlaygroundNav playgrounds={entries} currentId={chosen?.id ?? null} onNavigate={onNavigate} />
      <main className="mx-auto max-w-[90rem] px-6 pt-6 pb-24">
        {statusMessage === null ? null : <p role="status" data-testid="playground-status" className="text-sm text-muted-foreground">{statusMessage}</p>}
        {shown === null ? null : <PlaygroundCase key={shown.entry.id} playgroundPage={shown} />}
      </main>
    </div>
  )
}

export default Playground
