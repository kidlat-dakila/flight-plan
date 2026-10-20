import { fireEvent, render, screen, within } from "@testing-library/react"
import RepositoryAuthors, { type AuthorsChoice } from "@/components/RepositoryAuthors"

const LOCAL_GIT_AUTHORS: AuthorsChoice = {
  form: {
    gitSelfAuthor: null,
    searchHint: "Search by name or email.",
    searchPlaceholder: "Type a name or email",
  },
  trackedAuthors: [],
  search: { role: null, query: "", options: [], message: null, errorMessage: null },
}
const FORGE_AUTHORS: AuthorsChoice = {
  ...LOCAL_GIT_AUTHORS,
  form: {
    gitSelfAuthor: null,
    searchHint: "Search by name or username.",
    searchPlaceholder: "Type a name or username",
  },
}
const DEV = { id: "dev@acme.example", name: "Dev Harper", detail: "dev@acme.example", avatarUrl: null, monogram: "DH" }
const LENA = { id: "lena@acme.example", name: "Lena Okafor", detail: "lena@acme.example", avatarUrl: null, monogram: "LO" }
const TEO_OPTION = { ...LENA, id: "teo@acme.example", name: "Teo Marchetti", detail: "teo@acme.example", monogram: "TM", isTaken: false, stateLabel: null }

const renderAuthors = (overrides: Partial<AuthorsChoice> = {}) => {
  const handlers = {
    onAuthorQueryChange: vi.fn(),
    onAuthorSelect: vi.fn(),
    onTrackedAuthorRemove: vi.fn(),
  }
  render(<RepositoryAuthors authors={{ ...LOCAL_GIT_AUTHORS, ...overrides }} {...handlers} />)
  return handlers
}

describe("RepositoryAuthors", () => {
  it("asks only who to track on local git, with the hints of the backend", () => {
    renderAuthors()

    expect(screen.getAllByRole("combobox")).toHaveLength(1)
    expect(screen.getByRole("combobox", { name: "Track branches from specific team members" }).getAttribute("placeholder")).toBe("Type a name or email")
    expect(screen.getByText("Search by name or email.")).toBeTruthy()
  })

  it("asks only who to track on a forge", () => {
    renderAuthors(FORGE_AUTHORS)

    expect(screen.getAllByRole("combobox")).toHaveLength(1)
    expect(screen.getByRole("combobox", { name: "Track branches from specific team members" }).getAttribute("placeholder")).toBe("Type a name or username")
  })

  it("shows the user git config names, with no way to remove them", () => {
    renderAuthors({
      form: {
        gitSelfAuthor: { author: DEV },
        searchHint: "Search by name or email.",
        searchPlaceholder: "Type a name or email",
      },
    })

    expect(screen.getByText("Dev Harper")).toBeTruthy()
    expect(screen.queryByRole("button")).toBeNull()
  })

  it("waits for the author form before asking about authors", () => {
    renderAuthors({ form: null })

    expect(screen.queryByRole("combobox", { name: "Track branches from specific team members" })).toBeNull()
    expect(screen.getByRole("status").textContent).toBe("Reading the author settings…")
  })

  it("reports the role of the field that is opened or typed in", () => {
    const { onAuthorQueryChange } = renderAuthors()
    const tracked = screen.getByRole("combobox", { name: "Track branches from specific team members" })

    fireEvent.focus(tracked)
    fireEvent.change(tracked, { target: { value: "te" } })

    expect(onAuthorQueryChange).toHaveBeenNthCalledWith(1, "tracked", "")
    expect(onAuthorQueryChange).toHaveBeenNthCalledWith(2, "tracked", "te")
  })

  it("shows the suggestions of the tracked search, and selects one with its role", () => {
    const { onAuthorSelect } = renderAuthors({
      search: { role: "tracked", query: "te", options: [TEO_OPTION], message: null, errorMessage: null },
    })
    const tracked = screen.getByRole("combobox", { name: "Track branches from specific team members" })

    expect(tracked).toHaveProperty("value", "te")
    fireEvent.focus(tracked)
    fireEvent.click(screen.getByRole("option", { name: /Teo Marchetti/ }))

    expect(onAuthorSelect).toHaveBeenCalledWith("tracked", "teo@acme.example")
  })

  it("lists the tracked users and stops tracking one", () => {
    const { onTrackedAuthorRemove } = renderAuthors({ trackedAuthors: [LENA] })
    const tracked = within(screen.getByRole("list", { name: "Tracked team members" }))

    expect(tracked.getByText("Lena Okafor")).toBeTruthy()
    fireEvent.click(tracked.getByRole("button", { name: "Stop tracking Lena Okafor" }))

    expect(onTrackedAuthorRemove).toHaveBeenCalledWith("lena@acme.example")
  })
})
