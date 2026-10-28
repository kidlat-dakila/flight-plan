import type { ComparedChange, DefaultBaseBranch } from "@/procedures/get-review/utils/build-creation"
import { buildCreationPage } from "@/procedures/get-review/utils/build-review-page"
import type { CreationReading } from "@/procedures/get-review/utils/creation-reading"
import type { FileChange } from "@/procedures/get-review/utils/diff-stats"
import type { BranchTarget, PullRequestTarget, Repository, ReviewTarget } from "@/procedures/list-repositories/utils/repository"

const UPDATED_AT = new Date("2026-10-01T12:00:00.000Z")

const pullRequest: PullRequestTarget = {
  kind: "pull-request",
  number: 9,
  title: "Choose the branch each repository is compared with",
  branch: "feat/base-branch-choice",
  author: "kidlat-dakila",
  authorAvatarUrl: null,
  branchStatus: "no-review",
  isNew: false,
  updatedAt: UPDATED_AT,
}

const branch: BranchTarget = {
  kind: "branch",
  name: "spike/returns",
  branchStatus: "no-review",
  isNew: false,
  updatedAt: UPDATED_AT,
}

const repository: Repository = {
  name: "flight-plan",
  path: "/work/flight-plan",
  baseBranch: "main",
  forge: "gh",
  forgeSlug: "acme/flight-plan",
  problem: null,
  targets: [pullRequest, branch],
}

const PULL_REQUEST_BASE: DefaultBaseBranch = { branchName: "main", origin: "pull-request" }
const REPOSITORY_BASE: DefaultBaseBranch = { branchName: "main", origin: "repository" }

const changeOf = (path: string, kind: FileChange["kind"], addedCount: number, removedCount: number): FileChange =>
  ({ path, kind, addedCount, removedCount })

const SAMPLE_FILES: readonly FileChange[] = [
  changeOf("apps/backend/src/procedures/create-review/index.ts", "added", 1500, 20),
  changeOf("apps/backend/src/server/trpc/router.ts", "modified", 38, 7),
  changeOf("docs/DESIGN.md", "modified", 1000, 140),
]

const read = (files: readonly FileChange[]): ComparedChange => ({ kind: "read", files })

const compared = (change: ComparedChange, compareBranch: string | null = "main", defaultBranch = PULL_REQUEST_BASE): CreationReading =>
  ({ kind: "compared", compareBranch, defaultBranch, change })

const sourceOf = (target: ReviewTarget) => ({
  repository,
  lineColor: "green" as const,
  target,
  detail: null,
  artifact: null,
  notice: null,
  isOwn: false,
  forge: null,
  publications: [],
})

const creationOf = (target: ReviewTarget, reading: CreationReading) => {
  const page = buildCreationPage(sourceOf(target), reading)
  if (page.kind !== "creation") throw new Error(`Expected a creation page, got ${page.kind}.`)
  return page
}

describe("buildCreationPage", () => {
  it("introduces a pull request, sums its change and names the pull request base", () => {
    const page = creationOf(pullRequest, compared(read(SAMPLE_FILES)))

    expect(page.panels.explorer.label).toBe("Changed files")
    expect(page.creation).toStrictEqual({
      heading: "Create a new Flight Plan Review Artifact for “Choose the branch each repository is compared with”",
      author: expect.objectContaining({ name: "kidlat-dakila" }) as unknown,
      introduction: [
        { text: "kidlat-dakila wants to merge ", kind: "plain" },
        { text: "feat/base-branch-choice", kind: "code" },
        { text: " into ", kind: "plain" },
        { text: "main", kind: "code" },
        { text: " in pull request #9.", kind: "plain" },
      ],
      baseBranch: { branchName: "main", noteLabel: "Pull request base" },
      facts: [
        { label: "Files", value: "3", tone: "plain", size: "large" },
        { label: "Lines added", value: "+2,538", tone: "added", size: "large" },
        { label: "Lines removed", value: "−167", tone: "removed", size: "large" },
        { label: "Added", value: "1 file", tone: "plain", size: "small" },
        { label: "Modified", value: "2 files", tone: "plain", size: "small" },
        { label: "Deleted", value: "None", tone: "quiet", size: "small" },
      ],
      areas: {
        heading: "Where the lines are",
        rows: [
          {
            name: "apps/backend",
            isPath: true,
            fileCountLabel: "2 files",
            addedLabel: "+1,538",
            removedLabel: "−27",
            addedShare: 1538 / 1565,
            removedShare: 27 / 1565,
          },
          {
            name: "docs",
            isPath: true,
            fileCountLabel: "1 file",
            addedLabel: "+1,000",
            removedLabel: "−140",
            addedShare: 1000 / 1565,
            removedShare: 140 / 1565,
          },
        ],
      },
      problem: null,
      createLabel: "Create Review Artifact",
      creatingLabel: "Creating the review artifact",
    })
  })

  it("fills the docked explorer from the change, with nothing of a walkthrough on it", () => {
    const { fileExplorer } = creationOf(pullRequest, compared(read(SAMPLE_FILES)))

    expect(fileExplorer).toMatchObject({ summary: ["3 files"], filter: null, hiddenLabel: null })
    expect(fileExplorer.rows.filter((row) => row.kind === "file")).toStrictEqual([
      expect.objectContaining({ id: "apps/backend/src/procedures/create-review/index.ts", change: { kind: "added", label: "Added" } }),
      expect.objectContaining({ id: "apps/backend/src/server/trpc/router.ts", change: { kind: "modified", label: "Modified" } }),
      expect.objectContaining({ id: "docs/DESIGN.md", change: { kind: "modified", label: "Modified" } }),
    ])
    expect(fileExplorer.rows.flatMap((row) => (row.kind === "file" ? [[row.anchorId, row.noteLabel, row.marks, row.reviewed, row.match]] : [])))
      .toStrictEqual([[null, null, [], null, null], [null, null, [], null, null], [null, null, [], null, null]])
  })

  it("introduces a branch by what it has that its compare branch does not, and names the repository default", () => {
    const { creation } = creationOf(branch, compared(read(SAMPLE_FILES), "main", REPOSITORY_BASE))

    expect(creation).toMatchObject({
      heading: "Create a new Flight Plan Review Artifact for “spike/returns”",
      author: null,
      introduction: [
        { text: "Changes on ", kind: "plain" },
        { text: "spike/returns", kind: "code" },
        { text: " that are not on ", kind: "plain" },
        { text: "main", kind: "code" },
        { text: ".", kind: "plain" },
      ],
      baseBranch: { branchName: "main", noteLabel: "Repository default" },
    })
  })

  it("names no default for a compare branch that is not the default, and still says where the pull request merges", () => {
    const { creation } = creationOf(pullRequest, compared(read(SAMPLE_FILES), "develop"))

    expect(creation.baseBranch).toStrictEqual({ branchName: "develop", noteLabel: null })
    expect(creation.introduction.at(3)).toStrictEqual({ text: "main", kind: "code" })
  })

  it("names the repository default when a pull request falls back to the repository's base branch", () => {
    const { creation } = creationOf(pullRequest, compared(read(SAMPLE_FILES), "main", REPOSITORY_BASE))

    expect(creation.baseBranch).toStrictEqual({ branchName: "main", noteLabel: "Repository default" })
  })

  it("shows the problem and no facts, places or files when the change cannot be read against the branch", () => {
    const message = "The branch “gone” is not in this checkout. Fetch it or choose another branch."
    const page = creationOf(pullRequest, compared({ kind: "problem", message }, "gone"))

    expect(page.creation).toMatchObject({ problem: message, facts: [], areas: { rows: [] }, baseBranch: { branchName: "gone", noteLabel: null } })
    expect(page.fileExplorer).toMatchObject({ summary: ["0 files"], rows: [] })
  })

  it("keeps the four places with the most lines and merges the rest into one row", () => {
    const files = [
      changeOf("apps/backend/a.ts", "modified", 50, 50),
      changeOf("apps/frontend/a.ts", "modified", 40, 0),
      changeOf("packages/ui/a.ts", "modified", 30, 0),
      changeOf("README.md", "modified", 20, 0),
      changeOf("docs/a.md", "modified", 5, 0),
      changeOf("tools/lab/a.ts", "modified", 4, 1),
      changeOf("package.json", "modified", 1, 1),
    ]

    const { rows } = creationOf(branch, compared(read(files), "main", REPOSITORY_BASE)).creation.areas

    expect(rows.map(({ name, isPath, fileCountLabel }) => [name, isPath, fileCountLabel])).toStrictEqual([
      ["apps/backend", true, "1 file"],
      ["apps/frontend", true, "1 file"],
      ["packages/ui", true, "1 file"],
      ["Top-level files", false, "2 files"],
      ["2 more places", false, "2 files"],
    ])
    expect(rows.at(-1)).toMatchObject({ addedLabel: "+9", removedLabel: "−1", addedShare: 0.09, removedShare: 0.01 })
    expect(rows.at(0)).toMatchObject({ addedShare: 0.5, removedShare: 0.5 })
  })

  it("names a single merged place in the singular", () => {
    const files = ["a/b/1.ts", "c/d/1.ts", "e/f/1.ts", "g/h/1.ts", "i/j/1.ts"].map((path, index) => changeOf(path, "added", 10 - index, 0))

    const { rows } = creationOf(branch, compared(read(files), "main", REPOSITORY_BASE)).creation.areas

    expect(rows.at(-1)).toMatchObject({ name: "1 more place", isPath: false, fileCountLabel: "1 file" })
  })

  it("counts no lines of a change as None", () => {
    const { facts } = creationOf(branch, compared(read([changeOf("assets/logo.png", "added", 0, 0)]), "main", REPOSITORY_BASE)).creation

    expect(facts.slice(1, 3)).toStrictEqual([
      { label: "Lines added", value: "None", tone: "quiet", size: "large" },
      { label: "Lines removed", value: "None", tone: "quiet", size: "large" },
    ])
  })

  it("shows the missing page when the branch of the review cannot be read at all", () => {
    expect(buildCreationPage(sourceOf(pullRequest), { kind: "unreadable" })).toMatchObject({
      kind: "missing",
      heading: "Flight Plan could not build this review",
      message: "feat/base-branch-choice is not in this checkout. Fetch it and try again.",
    })
  })
})
