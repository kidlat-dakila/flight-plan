import { useLayoutEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { Setup } from "../components/Setup"
import { setupQuery } from "./api"
import "../setup/setup.css"

/**
 * `/setup` in a browser: the setup view, from a setup sample.
 *
 * In VS Code the setup panel keeps its own small bundle and gets the state
 * from the extension, which can build it before the server exists. In a
 * browser there is no VS Code to ask, so the page shows the samples the API
 * generates (`?state=fresh|outdated|ready|failed|remote`), and an action
 * gets no answer.
 */
export function SetupPage({ sample }: { sample: string }) {
  const state = useQuery(setupQuery(sample === "" ? "sample" : `sample/${sample}`))
  useLayoutEffect(() => {
    const root = window.document.documentElement
    root.classList.add("fp-setup-page")
    return () => {
      root.classList.remove("fp-setup-page")
    }
  }, [])

  if (state.error !== null) {
    return (
      <div className="fp-message fp-failed">
        <p>{state.error.message}</p>
      </div>
    )
  }
  return <Setup state={state.data ?? null} onAction={() => undefined} onConfig={() => undefined} />
}
