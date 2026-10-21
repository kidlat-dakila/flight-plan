import { fireEvent, render, screen } from "@testing-library/react"
import UpdateToast, { type UpdateToastNotice } from "@/components/UpdateToast"

const notice: UpdateToastNotice = {
  title: "Flight Plan 0.2.0 is out",
  description: "You have 0.1.6. Update with this command.",
  command: "npx @kidlat-dakila/flightplan@latest",
  copyLabel: "Copy command",
  copiedLabel: "Copied",
  releaseNotesLabel: "What's new in 0.2.0",
  releaseNotesUrl: "https://github.com/kidlat-dakila/flight-plan/releases/tag/v0.2.0",
  closeLabel: "Close",
}

describe("UpdateToast", () => {
  it("announces the new version with the command and a link to its release notes", () => {
    render(<UpdateToast notice={notice} isCopied={false} onCopy={vi.fn()} onClose={vi.fn()} />)

    const toast = screen.getByRole("status", { name: "Flight Plan 0.2.0 is out" })
    expect(toast.textContent).toContain("You have 0.1.6. Update with this command.")
    expect(screen.getByText("npx @kidlat-dakila/flightplan@latest")).toBeTruthy()
    expect(screen.getByRole("link", { name: "What's new in 0.2.0" }).getAttribute("href")).toBe(notice.releaseNotesUrl)
  })

  it("copies the command and says when it is copied", () => {
    const onCopy = vi.fn()
    const { rerender } = render(<UpdateToast notice={notice} isCopied={false} onCopy={onCopy} onClose={vi.fn()} />)

    fireEvent.click(screen.getByRole("button", { name: "Copy command" }))

    expect(onCopy).toHaveBeenCalledOnce()

    rerender(<UpdateToast notice={notice} isCopied onCopy={onCopy} onClose={vi.fn()} />)

    expect(screen.getByRole("button", { name: "Copied" })).toBeTruthy()
  })

  it("closes", () => {
    const onClose = vi.fn()
    render(<UpdateToast notice={notice} isCopied={false} onCopy={vi.fn()} onClose={onClose} />)

    fireEvent.click(screen.getByRole("button", { name: "Close" }))

    expect(onClose).toHaveBeenCalledOnce()
  })
})
