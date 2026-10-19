import { fireEvent, render, screen } from "@testing-library/react"
import ForgesForm from "@/components/ForgesForm"

const AVAILABLE = { kind: "available" as const, statusLabel: null }

const CODE_HOST_FEATURES = {
  label: "A code host connection adds:",
  items: ["The pull requests to review, with their labels", "Links into the code host's diff view"],
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
    <ForgesForm codeHostFeatures={CODE_HOST_FEATURES} hasCodeHost={false} forges={FORGES} problem={null} onSubmit={vi.fn()} {...overrides}>
      <button type="submit">Save</button>
    </ForgesForm>,
  )

const NONE_PICKED = [
  { forge: "glab", isPicked: false, username: "", token: "", baseUrl: "" },
  { forge: "github", isPicked: false, username: "", token: "", baseUrl: "" },
]

describe("ForgesForm", () => {
  it("lists what a code host adds and starts on local git only, with the code hosts closed", () => {
    renderForm()

    expect(screen.getByText("A code host connection adds:")).toBeTruthy()
    expect(screen.getByText("Links into the code host's diff view")).toBeTruthy()
    expect(screen.getByRole<HTMLInputElement>("radio", { name: "No, local git only" }).checked).toBe(true)
    expect(screen.queryByRole("list", { name: "Code hosts" })).toBeNull()
    expect(screen.queryByRole("radio", { name: /Default/ })).toBeNull()
  })

  it("opens the code hosts on yes, and locks one that is unavailable, with the reason", () => {
    renderForm()

    fireEvent.click(screen.getByRole("radio", { name: "Yes" }))

    expect(screen.getByRole("list", { name: "Code hosts" })).toBeTruthy()
    expect(screen.getByRole<HTMLInputElement>("checkbox", { name: /GitLab CLI/ }).disabled).toBe(true)
    expect(screen.getByText("glab is not installed on this machine.", { exact: false })).toBeTruthy()
  })

  it("opens the code hosts at once when one is saved", () => {
    renderForm({ hasCodeHost: true, forges: FORGES.map((option) => (option.forge === "github" ? { ...option, isPicked: true } : option)) })

    expect(screen.getByRole<HTMLInputElement>("radio", { name: "Yes" }).checked).toBe(true)
    expect(screen.getByRole<HTMLInputElement>("checkbox", { name: /GitHub token/ }).checked).toBe(true)
  })

  it("opens the fields of a picked code host and submits what was typed", () => {
    const onSubmit = vi.fn()
    renderForm({ onSubmit })

    fireEvent.click(screen.getByRole("radio", { name: "Yes" }))
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

  it("submits no code host after going back to local git only", () => {
    const onSubmit = vi.fn()
    renderForm({ onSubmit, hasCodeHost: true, forges: FORGES.map((option) => (option.forge === "github" ? { ...option, isPicked: true } : option)) })

    fireEvent.click(screen.getByRole("radio", { name: "No, local git only" }))
    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    expect(onSubmit).toHaveBeenCalledWith({ forges: NONE_PICKED })
  })

  it("shows a problem about a field under that field", () => {
    const picked = FORGES.map((option) => (option.forge === "github" ? { ...option, isPicked: true } : option))
    renderForm({
      hasCodeHost: true,
      forges: picked,
      problem: { message: "GitHub did not accept this token.", field: { owner: "github", name: "token" } },
    })

    expect(screen.getByRole("alert").textContent).toBe("GitHub did not accept this token.")
    expect(screen.getByLabelText("Token for GitHub token").getAttribute("aria-invalid")).toBe("true")
  })
})
