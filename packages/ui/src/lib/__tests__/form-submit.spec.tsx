import { act, fireEvent, render, screen } from "@testing-library/react"
import { useState } from "react"
import { submitHandlerOf } from "@/lib/form-submit"

const TickedForm = ({ onSubmit }: { readonly onSubmit: () => void }) => {
  const [isTicked, setIsTicked] = useState(false)
  return (
    <form onSubmit={submitHandlerOf(onSubmit)}>
      <label>
        <input type="checkbox" checked={isTicked} onChange={(event) => { setIsTicked(event.target.checked) }} />
        Ticked
      </label>
      <button type="submit">Save</button>
    </form>
  )
}

describe("submitHandlerOf", () => {
  it("submits without resetting the inputs to how they were when they mounted", async () => {
    const onSubmit = vi.fn()
    render(<TickedForm onSubmit={onSubmit} />)

    fireEvent.click(screen.getByRole("checkbox", { name: "Ticked" }))
    fireEvent.click(screen.getByRole("button", { name: "Save" }))
    await act(async () => {
      await Promise.resolve()
    })

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(screen.getByRole<HTMLInputElement>("checkbox", { name: "Ticked" }).checked).toBe(true)
  })
})
