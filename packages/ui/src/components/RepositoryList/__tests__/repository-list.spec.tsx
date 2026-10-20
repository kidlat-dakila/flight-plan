import { fireEvent, render, screen, within } from "@testing-library/react"
import RepositoryList from "@/components/RepositoryList"

const FOLLOWED = {
  name: "storefront",
  path: "/work/storefront",
  authorSearchHint: "You see your own branches. Add team members to see theirs too.",
  authorSearchPlaceholder: "Type a name or email",
  selfAuthor: null,
  trackedAuthors: [],
}

const ROWS = [
  { path: "/work/storefront", name: "storefront", stateLabel: null, followed: FOLLOWED },
  { path: "/work/ledger", name: "ledger", stateLabel: null, followed: null },
  { path: "/work/docs", name: "docs", stateLabel: "Already in Flight Plan", followed: null },
]

const AUTHOR_SEARCH = { repositoryName: null, role: null, query: "", options: [], message: null, errorMessage: null }

const renderList = (overrides: Partial<React.ComponentProps<typeof RepositoryList<typeof FOLLOWED>>> = {}) =>
  render(
    <RepositoryList
      rows={ROWS}
      listMessage={null}
      repositoryErrorMessage={null}
      isChangingRepositories={false}
      authorSearch={AUTHOR_SEARCH}
      onOpenAddRepository={vi.fn()}
      onFollow={vi.fn()}
      onUnfollow={vi.fn()}
      onAuthorQueryChange={vi.fn()}
      onAuthorTrackingChange={vi.fn()}
      onSelfAuthorChange={vi.fn()}
      {...overrides}
    />,
  )

describe("RepositoryList", () => {
  it("checks the followed rows and locks a repository already in Flight Plan", () => {
    renderList()

    const list = screen.getByRole("list", { name: "Repositories" })
    expect(within(list).getByRole<HTMLInputElement>("checkbox", { name: /storefront/ }).checked).toBe(true)
    expect(within(list).getByRole<HTMLInputElement>("checkbox", { name: /ledger/ }).checked).toBe(false)
    expect(within(list).getByRole<HTMLInputElement>("checkbox", { name: /docs/ }).disabled).toBe(true)
  })

  it("heads the list as recent repositories and offers to add one that is missing", () => {
    const onOpenAddRepository = vi.fn()
    renderList({ onOpenAddRepository })

    expect(screen.getByRole("heading", { name: "Recent repositories" })).toBeTruthy()
    expect(screen.getByText("Can't find your repository?")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Add repository" }))

    expect(onOpenAddRepository).toHaveBeenCalledTimes(1)
  })

  it("follows by path and stops following by name", () => {
    const onFollow = vi.fn()
    const onUnfollow = vi.fn()
    renderList({ onFollow, onUnfollow })

    fireEvent.click(screen.getByRole("checkbox", { name: /ledger/ }))
    fireEvent.click(screen.getByRole("checkbox", { name: /storefront/ }))

    expect(onFollow).toHaveBeenCalledWith("/work/ledger")
    expect(onUnfollow).toHaveBeenCalledWith("storefront")
  })

  it("draws what the page adds under each followed row only", () => {
    renderList({ followedFooter: (followed) => <a href={`/pr-reviews/${followed.name}/configurations`}>Prompt configurations</a> })

    expect(screen.getAllByRole("link", { name: "Prompt configurations" }).map((link) => link.getAttribute("href"))).toStrictEqual([
      "/pr-reviews/storefront/configurations",
    ])
  })
})
