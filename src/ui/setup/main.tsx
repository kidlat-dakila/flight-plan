import { useEffect, useState } from "react"
import { createRoot } from "react-dom/client"
import { Setup } from "../components/Setup"
import type { State } from "../../utils/setup/state"
import "./setup.css"

type VsCodeApi = { postMessage: (message: unknown) => void }
declare function acquireVsCodeApi(): VsCodeApi

const api = acquireVsCodeApi()

function App() {
  const [state, setState] = useState<State | null>(null)

  useEffect(() => {
    const onMessage = (event: MessageEvent<{ type?: string; state?: State }>) => {
      if (event.data?.type === "state" && event.data.state !== undefined) {
        setState(event.data.state)
      }
    }
    window.addEventListener("message", onMessage)
    // The panel asks rather than waiting to be pushed to, because one restored
    // by VS Code starts with no state and has to request it again.
    api.postMessage({ type: "ready" })
    return () => {
      window.removeEventListener("message", onMessage)
    }
  }, [])

  return (
    <Setup
      state={state}
      onAction={(step, action) => {
        api.postMessage({ type: "action", step, action })
      }}
      onConfig={(message) => {
        api.postMessage(message)
      }}
    />
  )
}

// `setup.css` is scoped to this class, so the browser's `/setup` route can
// carry it in the main bundle without restyling the review pages.
document.documentElement.classList.add("fp-setup-page")

const container = document.getElementById("root")
if (container) createRoot(container).render(<App />)
