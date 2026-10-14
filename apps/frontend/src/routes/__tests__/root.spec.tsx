import { QueryClient } from "@tanstack/react-query"
import { createMemoryHistory } from "@tanstack/react-router"
import { render, screen } from "@testing-library/react"
import { createApp } from "@/app"
import { createTrpcClient } from "@/trpc"
import { fakeBackendLinks, type ProcedureHandlers } from "./fake-backend"

const renderAppAt = (path: string, handlers: ProcedureHandlers) =>
  render(
    createApp({
      queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }),
      trpcClient: createTrpcClient(fakeBackendLinks(handlers)),
      history: createMemoryHistory({ initialEntries: [path] }),
    }),
  )

describe("the page that does not exist", () => {
  it("shows the plane flying with a question mark above the heading", async () => {
    const { container } = renderAppAt("/no-such-page", {})

    expect(await screen.findByRole("heading", { name: "PAN-PAN! We couldn't locate this page!" })).toBeTruthy()
    expect(container.querySelector("img[src='/not-found.svg']")).not.toBeNull()
    expect(screen.getByRole("link", { name: "Go to your repositories" }).getAttribute("href")).toBe("/")
  })
})

describe("the page shown when Flight Plan cannot start", () => {
  it("shows the falling plane above the heading and the backend's message", async () => {
    const { container } = renderAppAt("/", { "setup.gate": () => ({ errorMessage: "The settings file cannot be read." }) })

    expect(await screen.findByRole("heading", { name: "MAYDAY! MAYDAY! Flight Plan could not start" })).toBeTruthy()
    expect(screen.getByText("The settings file cannot be read.")).toBeTruthy()
    expect(container.querySelector("img[src='/server-error.svg']")).not.toBeNull()
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy()
  })
})
