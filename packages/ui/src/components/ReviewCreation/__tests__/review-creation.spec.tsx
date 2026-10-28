import { fireEvent, render, screen, within } from "@testing-library/react"
import { IDLE_BRANCH_SEARCH } from "@/components/BaseBranchField"
import ReviewCreation, { type ReviewCreationContent } from "@/components/ReviewCreation"

const CREATION: ReviewCreationContent = {
  heading: "Create a new Flight Plan Review Artifact for “Choose the branch each repository is compared with”",
  author: { name: "kidlat-dakila", avatarUrl: null, monogram: "K" },
  introduction: [
    { text: "kidlat-dakila wants to merge ", kind: "plain" },
    { text: "feat/base-branch-choice", kind: "code" },
    { text: " into ", kind: "plain" },
    { text: "main", kind: "code" },
    { text: " in pull request #9.", kind: "plain" },
  ],
  baseBranch: { branchName: "main", noteLabel: "Repository default" },
  facts: [
    { label: "Files", value: "148", tone: "plain", size: "large" },
    { label: "Lines added", value: "+2,538", tone: "added", size: "large" },
    { label: "Lines removed", value: "−167", tone: "removed", size: "large" },
    { label: "Added", value: "26 files", tone: "plain", size: "small" },
    { label: "Modified", value: "122 files", tone: "plain", size: "small" },
    { label: "Deleted", value: "None", tone: "quiet", size: "small" },
  ],
  areas: {
    heading: "Where the lines are",
    rows: [
      { name: "apps/backend", isPath: true, fileCountLabel: "117 files", addedLabel: "+1,376", removedLabel: "−106", addedShare: 0.93, removedShare: 0.07 },
      { name: "Top-level files", isPath: false, fileCountLabel: "2 files", addedLabel: "+31", removedLabel: "−15", addedShare: 0.02, removedShare: 0.01 },
    ],
  },
  problem: null,
  createLabel: "Create Review Artifact",
  creatingLabel: "Creating the review artifact",
}

const PROBLEM = "The branch main is not in this checkout."

interface CreationOverrides {
  readonly creation?: Partial<ReviewCreationContent>
  readonly isCreating?: boolean
  readonly errorMessage?: string | null
  readonly onTroubleshoot?: (() => void) | null
}

const renderCreation = (overrides: CreationOverrides = {}) => {
  const handlers = { onBranchQueryChange: vi.fn(), onBaseBranchChange: vi.fn(), onCreate: vi.fn() }
  const { container } = render(
    <ReviewCreation
      creation={{ ...CREATION, ...overrides.creation }}
      branchSearch={IDLE_BRANCH_SEARCH}
      isCreating={overrides.isCreating ?? false}
      errorMessage={overrides.errorMessage ?? null}
      onTroubleshoot={overrides.onTroubleshoot ?? null}
      {...handlers}
    />,
  )
  return { ...handlers, container }
}

const factValueOf = (label: string) => screen.getByText(label, { selector: "dt" }).nextElementSibling?.textContent

describe("ReviewCreation", () => {
  it("names the change in the heading and introduces it with the author and the branches", () => {
    const { container } = renderCreation()

    expect(screen.getByRole("heading", { level: 1, name: CREATION.heading })).toBeTruthy()
    expect(container.querySelector("p")?.textContent).toBe("Kkidlat-dakila wants to merge feat/base-branch-choice into main in pull request #9.")
    expect(screen.getByText("feat/base-branch-choice").className).toContain("font-mono")
    expect(screen.getByText("kidlat-dakila wants to merge").className).not.toContain("font-mono")
  })

  it("leaves the avatar out of a branch with no author", () => {
    const { container } = renderCreation({ creation: { author: null } })

    expect(container.querySelector("p")?.textContent).toBe("kidlat-dakila wants to merge feat/base-branch-choice into main in pull request #9.")
  })

  it("shows the branch it compares with and says it is the repository default", () => {
    renderCreation()

    expect(screen.getByRole<HTMLInputElement>("combobox", { name: "Branch to compare with" }).value).toBe("main")
    expect(screen.getByText("Repository default")).toBeTruthy()
  })

  it("lists the facts of the change as terms and values", () => {
    renderCreation()

    expect(screen.getAllByRole("term").map((term) => term.textContent)).toStrictEqual(["Files", "Lines added", "Lines removed", "Added", "Modified", "Deleted"])
    expect(factValueOf("Files")).toBe("148")
    expect(factValueOf("Lines added")).toBe("+2,538")
    expect(factValueOf("Lines removed")).toBe("−167")
    expect(factValueOf("Deleted")).toBe("None")
  })

  it("lists where the lines are, a path in mono and a place in plain type, with hidden bars", () => {
    renderCreation()

    const areas = screen.getByRole("region", { name: "Where the lines are" })
    const rows = within(areas).getAllByRole("listitem")

    expect(rows.map((row) => row.textContent)).toStrictEqual(["apps/backend+1,376−106", "Top-level files+31−15"])
    expect(within(areas).getByText("apps/backend").className).toContain("font-mono")
    expect(within(areas).getByText("Top-level files").className).not.toContain("font-mono")
    expect(rows[0]?.querySelector("[aria-hidden='true']")?.children).toHaveLength(2)
  })

  it("shows the problem and disables the button when the change cannot be read", () => {
    renderCreation({ creation: { problem: PROBLEM, facts: [], areas: { heading: "Where the lines are", rows: [] } } })

    expect(screen.getByRole("alert").textContent).toBe(PROBLEM)
    expect(screen.getByRole("button", { name: "Create Review Artifact" })).toHaveProperty("disabled", true)
    expect(screen.queryByRole("term")).toBeNull()
    expect(screen.queryByRole("region", { name: "Where the lines are" })).toBeNull()
  })

  it("creates the review artifact when the button is pressed", () => {
    const { onCreate } = renderCreation()

    fireEvent.click(screen.getByRole("button", { name: "Create Review Artifact" }))

    expect(onCreate).toHaveBeenCalledOnce()
  })

  it("says it is creating, with a spinning loader, while the artifact is built", () => {
    renderCreation({ isCreating: true })

    const button = screen.getByRole("button", { name: "Creating the review artifact" })

    expect(button).toHaveProperty("disabled", true)
    expect(button.getAttribute("aria-busy")).toBe("true")
    expect(button.querySelector("svg")?.getAttribute("class")).toContain("animate-spin")
  })

  it("shows the error under the button with a Troubleshoot link", () => {
    const onTroubleshoot = vi.fn()
    renderCreation({ errorMessage: "Flight Plan could not save the review artifact.", onTroubleshoot })

    expect(within(screen.getByRole("alert")).getByText("Flight Plan could not save the review artifact.")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Troubleshoot" }))

    expect(onTroubleshoot).toHaveBeenCalledOnce()
  })

  it("leaves the Troubleshoot link out when there is no way to troubleshoot", () => {
    renderCreation({ errorMessage: "That branch has no commits after main." })

    expect(screen.getByRole("alert").textContent).toBe("That branch has no commits after main.")
    expect(screen.queryByRole("button", { name: "Troubleshoot" })).toBeNull()
  })
})
