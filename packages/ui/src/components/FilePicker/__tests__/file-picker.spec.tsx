import { fireEvent, render, screen } from "@testing-library/react"
import FilePicker, { type FileOption } from "@/components/FilePicker"

const FILES: readonly FileOption[] = [
  { path: "src/stock/holds.ts", stateLabel: "Changed" },
  { path: "README.md", stateLabel: null },
]

const renderPicker = (files: readonly FileOption[] = FILES, message: string | null = null) => {
  const onQueryChange = vi.fn<(query: string) => void>()
  const onSelect = vi.fn<(path: string) => void>()
  render(
    <FilePicker
      label="File"
      hint={null}
      placeholder="Search the files"
      query=""
      files={files}
      message={message}
      errorMessage={null}
      onQueryChange={onQueryChange}
      onSelect={onSelect}
    />,
  )
  return { onQueryChange, onSelect, input: screen.getByRole("combobox", { name: "File" }) }
}

describe("FilePicker", () => {
  it("lists the files it is given when it is focused, each by its name, its folder and its state", () => {
    const { input } = renderPicker()

    fireEvent.focus(input)

    expect(screen.getAllByRole("option").map((option) => option.textContent)).toStrictEqual(["holds.tssrc/stockChanged", "README.md"])
  })

  it("reports what is typed and the path of the file that is picked", () => {
    const { input, onQueryChange, onSelect } = renderPicker()

    fireEvent.change(input, { target: { value: "hold" } })
    fireEvent.click(screen.getByRole("option", { name: /holds\.ts/ }))

    expect(onQueryChange).toHaveBeenCalledWith("hold")
    expect(onSelect).toHaveBeenCalledWith("src/stock/holds.ts")
  })

  it("shows the message it is given when there is no file to list", () => {
    const { input } = renderPicker([], "No file matches.")

    fireEvent.focus(input)

    expect(screen.getByText("No file matches.")).toBeTruthy()
  })
})
