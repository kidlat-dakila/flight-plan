import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { RouterProvider } from "react-router"
import { router } from "@/router"

const rootElement = document.getElementById("root")
if (rootElement === null) throw new Error("The page has no #root element.")

createRoot(rootElement).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
