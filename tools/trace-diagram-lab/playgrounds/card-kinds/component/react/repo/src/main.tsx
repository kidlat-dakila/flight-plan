import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { PokedexPage } from "@/pages/pokedex/PokedexPage"

const rootElement = document.getElementById("root")
if (rootElement === null) throw new Error("The page has no #root element.")

createRoot(rootElement).render(
  <StrictMode>
    <PokedexPage />
  </StrictMode>,
)
