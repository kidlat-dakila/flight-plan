import { QueryClient } from "@tanstack/react-query"
import { createMemoryHistory } from "@tanstack/react-router"
import { fireEvent, render, screen } from "@testing-library/react"
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

const updateNotice = {
  latestVersion: "0.2.0",
  runningVersion: "0.1.6",
  command: "npx @kidlat-dakila/flightplan@latest",
  title: "Flight Plan 0.2.0 is out",
  description: "You have 0.1.6. Update with this command.",
  copyLabel: "Copy command",
  copiedLabel: "Copied",
  releaseNotesLabel: "What's new in 0.2.0",
  releaseNotesUrl: "https://github.com/kidlat-dakila/flight-plan/releases/tag/v0.2.0",
  closeLabel: "Close",
}

describe("the notice of a newer Flight Plan", () => {
  it("shows a toast with the command, copies it, and closes", async () => {
    const writeText = vi.fn(async () => {
      await Promise.resolve()
    })
    Reflect.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true })
    renderAppAt("/no-such-page", { updateNotice: () => ({ data: updateNotice }) })

    expect(await screen.findByRole("status", { name: "Flight Plan 0.2.0 is out" })).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Copy command" }))

    expect(writeText).toHaveBeenCalledWith("npx @kidlat-dakila/flightplan@latest")
    expect(await screen.findByRole("button", { name: "Copied" })).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Close" }))

    expect(screen.queryByRole("status", { name: "Flight Plan 0.2.0 is out" })).toBeNull()
  })

  it("shows nothing when Flight Plan is up to date", async () => {
    renderAppAt("/no-such-page", {})

    expect(await screen.findByRole("heading", { name: "PAN-PAN! We couldn't locate this page!" })).toBeTruthy()
    expect(screen.queryByRole("status", { name: /is out/ })).toBeNull()
  })
})
