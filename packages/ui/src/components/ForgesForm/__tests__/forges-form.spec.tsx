import { fireEvent, render, screen } from "@testing-library/react"
import ForgesForm from "@/components/ForgesForm"

const AVAILABLE = { kind: "available" as const, statusLabel: null }

const CODE_HOST_FEATURES = {
  label: "Connecting a git forge also enables these features.",
  items: ["Fetching the open pull requests of you and your team members", "Most other features your git provider offers"],
}

const FORGES = [
  {
    forge: "glab" as const,
    label: "GitLab CLI",
    description: "Reaches GitLab through the GitLab command line tool.",
    isPicked: false,
    availability: { kind: "unavailable" as const, reason: "glab is not installed on this machine." },
    fields: [],
  },
  {
    forge: "github" as const,
    label: "GitHub token",
    description: "Reaches GitHub with a token.",
    isPicked: false,
    availability: AVAILABLE,
    fields: [{ name: "token" as const, label: "Token", hint: "Kept on this machine.", placeholder: "", value: "", isSecret: true }],
  },
]

const renderForm = (overrides: Partial<React.ComponentProps<typeof ForgesForm>> = {}) =>
  render(
    <ForgesForm codeHostFeatures={CODE_HOST_FEATURES} forges={FORGES} problem={null} onSubmit={vi.fn()} {...overrides}>
      <button type="submit">Save</button>
    </ForgesForm>,
  )

const NONE_PICKED = [
  { forge: "glab", isPicked: false, username: "", token: "", baseUrl: "" },
  { forge: "github", isPicked: false, username: "", token: "", baseUrl: "" },
]

describe("ForgesForm", () => {
  it("lists what a code host adds and every code host at once, none picked", () => {
    renderForm()

    expect(screen.getByText("Connecting a git forge also enables these features.")).toBeTruthy()
    expect(screen.getByText("Most other features your git provider offers")).toBeTruthy()
    expect(screen.getAllByRole<HTMLInputElement>("checkbox").map((checkbox) => checkbox.checked)).toStrictEqual([false, false])
    expect(screen.queryByRole("radio")).toBeNull()
  })

  it("locks a code host that is unavailable, with the reason", () => {
    renderForm()

    expect(screen.getByRole<HTMLInputElement>("checkbox", { name: /GitLab CLI/ }).disabled).toBe(true)
    expect(screen.getByText("glab is not installed on this machine.", { exact: false })).toBeTruthy()
  })

  it("checks a code host that is saved", () => {
    renderForm({ forges: FORGES.map((option) => (option.forge === "github" ? { ...option, isPicked: true } : option)) })

    expect(screen.getByRole<HTMLInputElement>("checkbox", { name: /GitHub token/ }).checked).toBe(true)
  })

  it("opens the fields of a picked code host and submits what was typed", () => {
    const onSubmit = vi.fn()
    renderForm({ onSubmit })

    fireEvent.click(screen.getByRole("checkbox", { name: /GitHub token/ }))
    fireEvent.change(screen.getByLabelText("Token for GitHub token"), { target: { value: "secret" } })
    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    expect(onSubmit).toHaveBeenCalledWith({
      forges: [
        { forge: "glab", isPicked: false, username: "", token: "", baseUrl: "" },
        { forge: "github", isPicked: true, username: "", token: "secret", baseUrl: "" },
      ],
    })
  })

  it("submits no code host after the saved one is unchecked", () => {
    const onSubmit = vi.fn()
    renderForm({ onSubmit, forges: FORGES.map((option) => (option.forge === "github" ? { ...option, isPicked: true } : option)) })

    fireEvent.click(screen.getByRole("checkbox", { name: /GitHub token/ }))
    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    expect(onSubmit).toHaveBeenCalledWith({ forges: NONE_PICKED })
  })

  it("shows a problem about a field under that field", () => {
    const picked = FORGES.map((option) => (option.forge === "github" ? { ...option, isPicked: true } : option))
    renderForm({
      forges: picked,
      problem: { message: "GitHub did not accept this token.", field: { owner: "github", name: "token" } },
    })

    expect(screen.getByRole("alert").textContent).toBe("GitHub did not accept this token.")
    expect(screen.getByLabelText("Token for GitHub token").getAttribute("aria-invalid")).toBe("true")
  })
})
