import { splitIntoGroups } from "@/code-blocks/group-files"
import type { ImportGraphFile } from "@/import-graph"

interface FileLinks {
  readonly importsTo?: readonly string[]
  readonly isChanged?: boolean
}

const clusterOf = (links: Readonly<Record<string, FileLinks>>): ImportGraphFile[] =>
  Object.keys(links).map((filePath) => ({
    filePath,
    gitSha: "head",
    diffType: links[filePath].isChanged === true ? "modified" : null,
    importsTo: links[filePath].importsTo ?? [],
    importedBy: Object.keys(links).filter((importer) => (links[importer].importsTo ?? []).includes(filePath)),
    importedFilePaths: new Map(),
  }))

const pathsOf = (groups: readonly (readonly ImportGraphFile[])[]): string[][] => groups.map((group) => group.map((file) => file.filePath))

describe("splitIntoGroups", () => {
  it("keeps the connected files of a cluster as one group", () => {
    const cluster = clusterOf({ "src/page.ts": { importsTo: ["src/cart.ts"] }, "src/cart.ts": { isChanged: true } })

    expect(pathsOf(splitIntoGroups(cluster))).toStrictEqual([["src/cart.ts", "src/page.ts"]])
  })

  it("leaves a test out of the group, and out of the files that import a file", () => {
    const cluster = clusterOf({ "src/cart.spec.ts": { importsTo: ["src/cart.ts"] }, "src/cart.ts": { isChanged: true } })
    const [[cart]] = splitIntoGroups(cluster)

    expect(cart.filePath).toBe("src/cart.ts")
    expect(cart.importedBy).toStrictEqual([])
  })

  it("splits the files only a test joined into groups of their own", () => {
    const cluster = clusterOf({
      "src/__tests__/all.ts": { importsTo: ["src/cart.ts", "src/users.ts"] },
      "src/cart.ts": { isChanged: true },
      "src/users.ts": { isChanged: true },
    })

    expect(pathsOf(splitIntoGroups(cluster))).toStrictEqual([["src/cart.ts"], ["src/users.ts"]])
  })

  it("drops the files that no longer lead to a change", () => {
    const cluster = clusterOf({
      "src/cart.stories.ts": { importsTo: ["src/cart.ts", "src/theme.ts"] },
      "src/cart.ts": { isChanged: true },
      "src/theme.ts": {},
    })

    expect(pathsOf(splitIntoGroups(cluster))).toStrictEqual([["src/cart.ts"]])
  })
})
