import { QueryClient } from "@tanstack/react-query"
import { createMemoryHistory } from "@tanstack/react-router"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createApp } from "@/app"
import { reportPageErrors } from "@/page-errors"
import { createTrpcClient } from "@/trpc"
import { fakeBackendLinks, type ProcedureHandlers, type ProcedureReply } from "./fake-backend"

const LOG_ID = "20261023-142530-a1b2c3"
const REQUEST_ID = "20261023-142600-d4e5f6"
const COMMAND = `cd '/Users/dana/.flightplan/logs' && claude '/flightplan:troubleshoot ${REQUEST_ID}'`

const formOf = (errorMessage: string | null) => ({
  title: "Troubleshoot",
  intro: "Flight Plan will launch Claude in a terminal to troubleshoot it.",
  error: errorMessage === null ? null : { label: "The error", message: errorMessage },
  description: errorMessage === null
    ? { label: "What went wrong?", placeholder: "Say what you did and what happened.", isRequired: true }
    : { label: "What were you doing when it happened?", placeholder: "Optional.", isRequired: false },
  privacyNote: "The logs stay on this computer.",
  problem: null,
  launchLabel: "Launch Claude",
  cancelLabel: "Cancel",
  closeLabel: "Done",
  manual: { label: "Run this command in a terminal", copyLabel: "Copy command", copiedMessage: "Command copied" },
})

const renderAppAt = (path: string, handlers: ProcedureHandlers) =>
  render(
    createApp({
      queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }),
      trpcClient: createTrpcClient(fakeBackendLinks(handlers)),
      history: createMemoryHistory({ initialEntries: [path] }),
    }),
  )

const replyWith = (reply: ProcedureReply) => vi.fn<(input: unknown) => ProcedureReply>(() => reply)

describe("troubleshooting", () => {
  it("opens from the top bar and launches the agent with what the user wrote", async () => {
    const form = replyWith({ data: formOf(null) })
    const request = replyWith({ data: { kind: "opened", message: "Claude is starting in Terminal to troubleshoot." } })
    renderAppAt("/no-such-page", { "troubleshooting.form": form, "troubleshooting.request": request })

    fireEvent.click(await screen.findByRole("button", { name: "Troubleshoot" }))
    const dialog = await screen.findByRole("dialog", { name: "Troubleshoot" })
    fireEvent.change(within(dialog).getByRole("textbox", { name: "What went wrong?" }), { target: { value: "The diagram is empty." } })
    fireEvent.click(within(dialog).getByRole("button", { name: "Launch Claude" }))

    expect(await within(dialog).findByText("Claude is starting in Terminal to troubleshoot.")).toBeTruthy()
    expect(form).toHaveBeenCalledWith({ errorLogId: null, shownError: null })
    expect(request).toHaveBeenCalledWith({
      errorLogId: null,
      shownError: null,
      description: "The diagram is empty.",
      page: { path: "/no-such-page", title: expect.any(String) as unknown },
    })
  })

  it("troubleshoots the error Flight Plan could not start with, by its log id", async () => {
    const form = replyWith({ data: formOf("The settings file cannot be read.") })
    renderAppAt("/", {
      "setup.gate": () => ({ errorMessage: "The settings file cannot be read.", logId: LOG_ID }),
      "troubleshooting.form": form,
    })

    await screen.findByRole("heading", { name: "MAYDAY! MAYDAY! Flight Plan could not start" })
    fireEvent.click(screen.getByRole("button", { name: "Troubleshoot" }))
    const dialog = await screen.findByRole("dialog", { name: "Troubleshoot" })

    expect(within(dialog).getByRole("region", { name: "The error" }).textContent).toContain("The settings file cannot be read.")
    expect(form).toHaveBeenCalledWith({ errorLogId: LOG_ID, shownError: "The settings file cannot be read." })
  })

  it("gives the command to copy when Flight Plan cannot open a terminal", async () => {
    const writeText = vi.fn(async () => {
      await Promise.resolve()
    })
    Reflect.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true })
    renderAppAt("/no-such-page", {
      "troubleshooting.form": replyWith({ data: formOf("It broke.") }),
      "troubleshooting.request": replyWith({ data: { kind: "manual", message: "Flight Plan can open a terminal on macOS only.", command: COMMAND } }),
    })

    fireEvent.click(await screen.findByRole("button", { name: "Troubleshoot" }))
    const dialog = await screen.findByRole("dialog", { name: "Troubleshoot" })
    fireEvent.click(await within(dialog).findByRole("button", { name: "Launch Claude" }))
    fireEvent.click(await within(dialog).findByRole("button", { name: "Copy command" }))

    expect(writeText).toHaveBeenCalledWith(COMMAND)
    expect(await within(dialog).findByRole("button", { name: "Command copied" })).toBeTruthy()
  })
})

describe("reportPageErrors", () => {
  it("logs an error the page threw, and leaves failed calls to the backend's own log", async () => {
    const recordError = replyWith({ data: { logId: LOG_ID } })
    reportPageErrors(createTrpcClient(fakeBackendLinks({ "troubleshooting.recordError": recordError })), window)

    window.dispatchEvent(new ErrorEvent("error", { error: new TypeError("Cannot read properties of undefined") }))

    await waitFor(() => {
      expect(recordError).toHaveBeenCalledWith(expect.objectContaining({ message: "Cannot read properties of undefined" }))
    })
  })
})
