import { fireEvent, render, screen, within } from "@testing-library/react"
import RepositoryAuthors, { type AuthorsChoice } from "@/components/RepositoryAuthors"

const LOCAL_GIT_AUTHORS: AuthorsChoice = {
  form: {
    selfAuthorHint: "Git cannot tell who you are here.",
    gitSelfAuthor: null,
    searchHint: "Search by name or email.",
    searchPlaceholder: "Type a name or email",
  },
  selfAuthor: null,
  trackedAuthors: [],
  search: { role: null, query: "", options: [], message: null, errorMessage: null },
}
const FORGE_AUTHORS: AuthorsChoice = {
  ...LOCAL_GIT_AUTHORS,
  form: {
    selfAuthorHint: null,
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
    onSelfAuthorRemove: vi.fn(),
    onTrackedAuthorRemove: vi.fn(),
  }
  render(<RepositoryAuthors authors={{ ...LOCAL_GIT_AUTHORS, ...overrides }} {...handlers} />)
  return handlers
}

describe("RepositoryAuthors", () => {
  it("asks who the user is and who to track on local git, with the hints of the backend", () => {
    renderAuthors()

    expect(screen.getByRole("combobox", { name: "Which user are you?" }).getAttribute("placeholder")).toBe("Type a name or email")
    expect(screen.getByText("Git cannot tell who you are here.")).toBeTruthy()
    expect(screen.getByRole("combobox", { name: "Track specific team members" })).toBeTruthy()
    expect(screen.getByText("Search by name or email.")).toBeTruthy()
  })

  it("only asks who to track when a forge account tells who the user is", () => {
    renderAuthors(FORGE_AUTHORS)

    expect(screen.queryByRole("combobox", { name: "Which user are you?" })).toBeNull()
    expect(screen.getByRole("combobox", { name: "Track specific team members" }).getAttribute("placeholder")).toBe("Type a name or username")
  })

  it("shows the user git config names, with no way to remove them, instead of asking who the user is", () => {
    renderAuthors({
      form: {
        selfAuthorHint: null,
        gitSelfAuthor: { author: DEV, stateLabel: "You, from git config" },
        searchHint: "Search by name or email.",
        searchPlaceholder: "Type a name or email",
      },
    })

    expect(screen.queryByRole("combobox", { name: "Which user are you?" })).toBeNull()
    expect(screen.getByText("Dev Harper")).toBeTruthy()
    expect(screen.getByText("You, from git config")).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Choose another user as you" })).toBeNull()
  })

  it("waits for the author form before asking about authors", () => {
    renderAuthors({ form: null })

    expect(screen.queryByRole("combobox", { name: "Track specific team members" })).toBeNull()
    expect(screen.getByRole("status").textContent).toBe("Reading the author settings…")
  })

  it("reports the role of the field that is opened or typed in", () => {
    const { onAuthorQueryChange } = renderAuthors()
    const tracked = screen.getByRole("combobox", { name: "Track specific team members" })

    fireEvent.focus(tracked)
    fireEvent.change(tracked, { target: { value: "te" } })
    fireEvent.focus(screen.getByRole("combobox", { name: "Which user are you?" }))

    expect(onAuthorQueryChange).toHaveBeenNthCalledWith(1, "tracked", "")
    expect(onAuthorQueryChange).toHaveBeenNthCalledWith(2, "tracked", "te")
    expect(onAuthorQueryChange).toHaveBeenNthCalledWith(3, "self", "")
  })

  it("shows the suggestions only under the field that searched, and selects one with its role", () => {
    const { onAuthorSelect } = renderAuthors({
      search: { role: "tracked", query: "te", options: [TEO_OPTION], message: null, errorMessage: null },
    })
    const tracked = screen.getByRole("combobox", { name: "Track specific team members" })

    expect(tracked).toHaveProperty("value", "te")
    expect(screen.getByRole("combobox", { name: "Which user are you?" })).toHaveProperty("value", "")
    fireEvent.focus(tracked)
    fireEvent.click(screen.getByRole("option", { name: /Teo Marchetti/ }))

    expect(onAuthorSelect).toHaveBeenCalledWith("tracked", "teo@acme.example")
  })

  it("shows the user once chosen, instead of the search, and lets them be unchosen", () => {
    const { onSelfAuthorRemove } = renderAuthors({ selfAuthor: DEV })

    expect(screen.queryByRole("combobox", { name: "Which user are you?" })).toBeNull()
    expect(screen.getByText("Dev Harper")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Choose another user as you" }))

    expect(onSelfAuthorRemove).toHaveBeenCalledTimes(1)
  })

  it("lists the tracked users and stops tracking one", () => {
    const { onTrackedAuthorRemove } = renderAuthors({ trackedAuthors: [LENA] })
    const tracked = within(screen.getByRole("list", { name: "Tracked team members" }))

    expect(tracked.getByText("Lena Okafor")).toBeTruthy()
    fireEvent.click(tracked.getByRole("button", { name: "Stop tracking Lena Okafor" }))

    expect(onTrackedAuthorRemove).toHaveBeenCalledWith("lena@acme.example")
  })
})
