import { fireEvent, render, screen } from "@testing-library/react"
import ForgesForm from "@/components/ForgesForm"

const AVAILABLE = { kind: "available" as const, statusLabel: null }

const FORGES = [
  {
    forge: "git" as const,
    label: "Local git",
    description: "Reviews the branches of a repository on this machine.",
    isPicked: true,
    isRequired: true,
    availability: AVAILABLE,
    fields: [],
    limitation: { label: "With local git only, Flight Plan cannot:", items: ["List pull requests to review"] },
  },
  {
    forge: "glab" as const,
    label: "GitLab CLI",
    description: "Reaches GitLab through the GitLab command line tool.",
    isPicked: false,
    isRequired: false,
    availability: { kind: "unavailable" as const, reason: "glab is not installed on this machine." },
    fields: [],
    limitation: null,
  },
  {
    forge: "github" as const,
    label: "GitHub token",
    description: "Reaches GitHub with a token.",
    isPicked: false,
    isRequired: false,
    availability: AVAILABLE,
    fields: [{ name: "token" as const, label: "Token", hint: "Kept on this machine.", placeholder: "", value: "", isSecret: true }],
    limitation: null,
  },
]

const renderForm = (overrides: Partial<React.ComponentProps<typeof ForgesForm>> = {}) =>
  render(
    <ForgesForm forges={FORGES} defaultForge="git" problem={null} onSubmit={vi.fn()} {...overrides}>
      <button type="submit">Save</button>
    </ForgesForm>,
  )

describe("ForgesForm", () => {
  it("locks the required forge and a forge that is unavailable, with the reason", () => {
    renderForm()

    expect(screen.getByRole<HTMLInputElement>("checkbox", { name: /Local git/ }).disabled).toBe(true)
    expect(screen.getByRole<HTMLInputElement>("checkbox", { name: /GitLab CLI/ }).disabled).toBe(true)
    expect(screen.getByText("glab is not installed on this machine.", { exact: false })).toBeTruthy()
    expect(screen.getByText("List pull requests to review")).toBeTruthy()
  })

  it("opens the fields of a picked forge, makes it the default and submits what was typed", () => {
    const onSubmit = vi.fn()
    renderForm({ onSubmit })

    fireEvent.click(screen.getByRole("checkbox", { name: /GitHub token/ }))
    fireEvent.change(screen.getByLabelText("Token for GitHub token"), { target: { value: "secret" } })
    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    expect(onSubmit).toHaveBeenCalledWith({
      forges: [
        { forge: "git", isPicked: true, username: "", token: "", baseUrl: "" },
        { forge: "glab", isPicked: false, username: "", token: "", baseUrl: "" },
        { forge: "github", isPicked: true, username: "", token: "secret", baseUrl: "" },
      ],
      defaultForge: "github",
    })
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
