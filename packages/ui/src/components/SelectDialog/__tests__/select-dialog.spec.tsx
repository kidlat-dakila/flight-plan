import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import SelectDialog, { type SelectDialogOption } from "@/components/SelectDialog"

const OPTIONS: readonly SelectDialogOption[] = [
  {
    key: "standard",
    label: "Standard",
    tagLabel: "Default",
    summary: "Best for general pull requests.",
    description: "The agent writes the full review.",
    note: null,
  },
  {
    key: "minimal",
    label: "Minimal",
    tagLabel: null,
    summary: "Best for saving tokens.",
    description: "The agent writes few words.",
    note: "The diagrams are off by default.",
  },
]

const renderSelect = (onChoose: (key: string) => void, selectedKey = "standard") =>
  render(
    <SelectDialog
      label="Configuration"
      dialogTitle="Choose a configuration"
      dialogDescription="Only how the review is written changes."
      chooseLabel="Choose"
      cancelLabel="Cancel"
      options={OPTIONS}
      selectedKey={selectedKey}
      onChoose={onChoose}
    />,
  )

describe("SelectDialog", () => {
  it("shows the selected option with its tag and summary on a button, with the options closed", () => {
    renderSelect(vi.fn())

    const trigger = screen.getByRole("button", { name: "Configuration: Standard" })

    expect(trigger.textContent).toContain("Default")
    expect(trigger.textContent).toContain("Best for general pull requests.")
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("opens a dialog that lists every option, with the selected one ticked", async () => {
    renderSelect(vi.fn())

    fireEvent.click(screen.getByRole("button", { name: "Configuration: Standard" }))

    expect(await screen.findByRole("dialog", { name: "Choose a configuration" })).toBeTruthy()
    expect(screen.getByRole<HTMLInputElement>("radio", { name: /Standard/ }).checked).toBe(true)
    expect(screen.getByRole<HTMLInputElement>("radio", { name: /Minimal/ }).checked).toBe(false)
    expect(screen.getByText("The diagrams are off by default.")).toBeTruthy()
  })

  it("reports the option that was picked once it is chosen, and closes", async () => {
    const onChoose = vi.fn()
    renderSelect(onChoose)

    fireEvent.click(screen.getByRole("button", { name: "Configuration: Standard" }))
    fireEvent.click(await screen.findByRole("radio", { name: /Minimal/ }))
    fireEvent.click(screen.getByRole("button", { name: "Choose" }))

    expect(onChoose).toHaveBeenCalledWith("minimal")
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull()
    })
  })

  it("reports nothing when the dialog is cancelled, and forgets the pick", async () => {
    const onChoose = vi.fn()
    renderSelect(onChoose)

    fireEvent.click(screen.getByRole("button", { name: "Configuration: Standard" }))
    fireEvent.click(await screen.findByRole("radio", { name: /Minimal/ }))
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull()
    })
    fireEvent.click(screen.getByRole("button", { name: "Configuration: Standard" }))

    expect(onChoose).not.toHaveBeenCalled()
    expect((await screen.findByRole<HTMLInputElement>("radio", { name: /Standard/ })).checked).toBe(true)
  })
})
