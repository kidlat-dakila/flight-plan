import { buildFixtureIndex, chooseCaseName } from "@/procedures/list-fixtures/utils/build-fixture-index"
import type { Repository } from "@/procedures/list-repositories/utils/repository"

const NOW = new Date("2026-01-01T00:38:00.000Z")
const CASE_NAMES = ["react-spa", "typescript"]

const typescriptRepository: Repository = {
  name: "typescript",
  path: "/fixtures/typescript",
  baseBranch: null,
  forge: "git",
  forgeSlug: null,
  problem: null,
  targets: [
    {
      kind: "pull-request",
      number: 1,
      title: "Modified function stockOf to subtract held stock",
      branch: "modified-function-stockof",
      author: "fixture-author",
      authorAvatarUrl: null,
      branchStatus: "no-review",
      isNew: false,
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    },
  ],
}

describe("chooseCaseName", () => {
  it("keeps the requested case when the catalog has it", () => {
    expect(chooseCaseName(CASE_NAMES, "typescript")).toBe("typescript")
  })

  it("falls back to the first case when none is requested", () => {
    expect(chooseCaseName(CASE_NAMES, null)).toBe("react-spa")
  })

  it("falls back to the first case when the requested one is unknown", () => {
    expect(chooseCaseName(CASE_NAMES, "../secrets")).toBe("react-spa")
  })

  it("chooses nothing when the catalog is empty", () => {
    expect(chooseCaseName([], "typescript")).toBeNull()
  })
})

describe("buildFixtureIndex", () => {
  it("offers every case in the select, with the shown one chosen", () => {
    expect(buildFixtureIndex(CASE_NAMES, typescriptRepository, NOW).caseSelect).toStrictEqual({
      label: "Test case",
      value: "typescript",
      options: [
        { value: "react-spa", label: "react-spa" },
        { value: "typescript", label: "typescript" },
      ],
    })
  })

  it("shows the case as a repository line whose stops are named and linked by their snapshot", () => {
    expect(buildFixtureIndex(CASE_NAMES, typescriptRepository, NOW).repository).toMatchObject({
      name: "typescript",
      lineColor: "green",
      lineLabel: "T",
      source: [{ text: "Local git", kind: "plain" }, { text: "/fixtures/typescript", kind: "code" }],
      countLabel: "1 review target",
      content: {
        kind: "targets",
        targets: [
          {
            id: "modified-function-stockof",
            title: { text: "Modified function stockOf to subtract held stock", kind: "plain" },
            details: [{ text: "#1", kind: "plain" }, { text: "modified-function-stockof", kind: "code" }],
            author: { name: "fixture-author", avatarUrl: null, monogram: "FA" },
            href: "/pr-reviews/typescript/modified-function-stockof",
            statusLabel: "No review",
            updatedLabel: "38 minutes ago",
          },
        ],
      },
    })
  })
})
