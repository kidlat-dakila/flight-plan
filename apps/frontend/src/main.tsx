import { QueryClient } from "@tanstack/react-query"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { createApp } from "./app"
import { reportPageErrors } from "./page-errors"
import { backendLinks, createTrpcClient } from "./trpc"
import "./styles.css"

const rootElement = document.getElementById("root")
if (!rootElement) throw new Error("Missing #root element in index.html")

const trpcClient = createTrpcClient(backendLinks())
reportPageErrors(trpcClient, window)

const app = createApp({ queryClient: new QueryClient(), trpcClient })

createRoot(rootElement).render(<StrictMode>{app}</StrictMode>)
