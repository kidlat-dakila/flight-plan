import {
  AT_REPOSITORIES,
  CHECKOUT_WEB,
  createSetupContext,
  DEV,
  GITHUB_FORGES,
  LENA,
  READY_TO_FINISH,
  servedByForge,
} from "@/procedures/get-setup/utils/__tests__/setup-fixture"
import { searchAdditionAuthors } from "@/procedures/search-addition-authors"

const NO_SELECTION = { repositoryName: null, selfAuthorId: null, trackedAuthorIds: [] }
const FOLDER = "/Users/dev/projects/ledger-api"

describe("searchAdditionAuthors", () => {
  it("searches the commit authors of a folder that is not added yet", async () => {
    const suggestions = await searchAdditionAuthors(
      { path: FOLDER, role: "tracked", query: "lena", ...NO_SELECTION },
      createSetupContext(AT_REPOSITORIES),
    )

    expect(suggestions).toMatchObject({
      options: [{ id: LENA.id, isTaken: false, stateLabel: null }],
      message: null,
    })
  })

  it("marks the authors already chosen in the form and leaves the user out of the tracked ones", async () => {
    const suggestions = await searchAdditionAuthors(
      { path: FOLDER, repositoryName: null, role: "tracked", query: "", selfAuthorId: DEV.id, trackedAuthorIds: [LENA.id] },
      createSetupContext(AT_REPOSITORIES),
    )

    expect(suggestions.options.map((option) => [option.id, option.stateLabel])).toStrictEqual([
      ["amara@acme.example", null],
      ["jonas@acme.example", null],
      [LENA.id, "Tracked"],
      ["mira@acme.example", null],
      ["teo@acme.example", null],
    ])
  })

  it("searches the forge's members when the default forge is not local git", async () => {
    const suggestions = await searchAdditionAuthors(
      { path: FOLDER, role: "tracked", query: "teo", ...NO_SELECTION },
      createSetupContext({ ...AT_REPOSITORIES, forges: GITHUB_FORGES }),
    )

    expect(suggestions).toMatchObject({ options: [{ id: "@teo", detail: "@teo" }] })
  })

  it("searches the forge that serves the folder, even when the default forge is local git", async () => {
    const suggestions = await searchAdditionAuthors(
      { path: FOLDER, role: "tracked", query: "teo", ...NO_SELECTION },
      servedByForge(createSetupContext(AT_REPOSITORIES), "gh"),
    )

    expect(suggestions).toMatchObject({ options: [{ id: "@teo" }] })
  })

  it("asks for the folder first when none is typed", async () => {
    await expect(
      searchAdditionAuthors({ path: "  ", role: "self", query: "", ...NO_SELECTION }, createSetupContext(AT_REPOSITORIES)),
    ).resolves.toStrictEqual({ options: [], message: "Choose the repository folder first." })
  })

  it("explains a path that cannot be added", async () => {
    await expect(
      searchAdditionAuthors(
        { path: "projects/ledger-api", role: "self", query: "", ...NO_SELECTION },
        createSetupContext(AT_REPOSITORIES),
      ),
    ).resolves.toStrictEqual({
      options: [],
      message: "Enter the full path to a repository folder, for example /Users/you/projects/storefront.",
    })
  })

  it("says so when the folder is not a git repository", async () => {
    await expect(
      searchAdditionAuthors(
        { path: "/Users/dev/projects/meeting-notes", role: "self", query: "", ...NO_SELECTION },
        createSetupContext(AT_REPOSITORIES),
      ),
    ).resolves.toStrictEqual({ options: [], message: "/Users/dev/projects/meeting-notes is not a git repository." })
  })

  it("searches the saved folder of a repository being configured, which is already on the list", async () => {
    const suggestions = await searchAdditionAuthors(
      { path: "", repositoryName: "checkout-web", role: "tracked", query: "lena", selfAuthorId: DEV.id, trackedAuthorIds: [] },
      createSetupContext(READY_TO_FINISH),
    )

    expect(suggestions).toMatchObject({ options: [{ id: LENA.id }], message: null })
  })

  it("says so when the repository being configured is not on the list", async () => {
    await expect(
      searchAdditionAuthors(
        { ...NO_SELECTION, path: "", repositoryName: "ledger-api", role: "tracked", query: "" },
        createSetupContext(READY_TO_FINISH),
      ),
    ).resolves.toStrictEqual({ options: [], message: "ledger-api is no longer on the list." })
  })

  it("says so when the folder is already on the list", async () => {
    await expect(
      searchAdditionAuthors(
        { path: CHECKOUT_WEB.path, role: "self", query: "", ...NO_SELECTION },
        createSetupContext(READY_TO_FINISH),
      ),
    ).resolves.toStrictEqual({ options: [], message: "/Users/dev/projects/checkout-web is already on the list." })
  })
})
