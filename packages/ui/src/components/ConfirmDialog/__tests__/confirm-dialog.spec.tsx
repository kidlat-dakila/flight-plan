import { fireEvent, render, screen } from "@testing-library/react"
import ConfirmDialog from "@/components/ConfirmDialog"

const renderConfirm = (onConfirm = vi.fn(), onCancel = vi.fn()) =>
  render(
    <ConfirmDialog
      title="Clear this diagram?"
      description="Every card and line goes."
      confirmLabel="Clear diagram"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />,
  )

describe("ConfirmDialog", () => {
  it("asks its question with a description, and reports the confirmation", async () => {
    const onConfirm = vi.fn()
    renderConfirm(onConfirm)

    const dialog = await screen.findByRole("dialog", { name: "Clear this diagram?" })
    fireEvent.click(screen.getByRole("button", { name: "Clear diagram" }))

    expect(dialog.textContent).toContain("Every card and line goes.")
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it("reports a cancel from its button and from Escape, and never the confirmation", async () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    renderConfirm(onConfirm, onCancel)

    fireEvent.click(await screen.findByRole("button", { name: "Cancel" }))
    fireEvent.keyDown(await screen.findByRole("dialog"), { key: "Escape" })

    expect(onCancel).toHaveBeenCalledTimes(2)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it("puts the focus on Cancel first", async () => {
    renderConfirm()

    const cancel = await screen.findByRole("button", { name: "Cancel" })

    await vi.waitFor(() => {
      expect(document.activeElement).toBe(cancel)
    })
  })
})
