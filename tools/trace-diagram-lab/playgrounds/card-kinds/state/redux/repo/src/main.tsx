import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { Provider } from "react-redux"
import { App } from "@/App"
import { store } from "@/store"

const rootElement = document.getElementById("root")
if (rootElement === null) throw new Error("The page has no #root element.")

createRoot(rootElement).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
)
