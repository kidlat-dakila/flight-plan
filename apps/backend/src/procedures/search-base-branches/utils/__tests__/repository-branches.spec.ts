import { mainBranchOf, parseBranchRefs, remoteHeadBranchOf } from "@/procedures/search-base-branches/utils/repository-branches"

const refLine = (refName: string, committedAt: string): string => `${refName}\t${committedAt}`

describe("parseBranchRefs", () => {
  it("reads local and origin branches as one entry per name, keeping the newer commit time", () => {
    const output = [
      refLine("refs/heads/main", "2026-10-10T08:00:00+00:00"),
      refLine("refs/remotes/origin/main", "2026-10-12T08:00:00+00:00"),
      refLine("refs/heads/develop", "2026-10-15T08:00:00+00:00"),
      refLine("refs/remotes/origin/develop", "2026-10-14T08:00:00+00:00"),
      refLine("refs/remotes/origin/release/2026.10", "2026-10-01T08:00:00+00:00"),
    ].join("\n")

    expect(parseBranchRefs(output)).toStrictEqual([
      { name: "main", committedAt: new Date("2026-10-12T08:00:00Z") },
      { name: "develop", committedAt: new Date("2026-10-15T08:00:00Z") },
      { name: "release/2026.10", committedAt: new Date("2026-10-01T08:00:00Z") },
    ])
  })

  it("leaves out origin's HEAD, refs of other remotes and lines it cannot read", () => {
    const output = [
      refLine("refs/remotes/origin/HEAD", "2026-10-12T08:00:00+00:00"),
      refLine("refs/remotes/upstream/main", "2026-10-12T08:00:00+00:00"),
      refLine("refs/heads/fix", "not a date"),
      "",
      refLine("refs/heads/main", "2026-10-12T08:00:00+00:00"),
    ].join("\n")

    expect(parseBranchRefs(output)).toStrictEqual([{ name: "main", committedAt: new Date("2026-10-12T08:00:00Z") }])
  })
})

describe("remoteHeadBranchOf", () => {
  it("names the branch origin's HEAD points at", () => {
    expect(remoteHeadBranchOf("refs/remotes/origin/trunk\n")).toBe("trunk")
    expect(remoteHeadBranchOf("refs/remotes/origin/release/next\n")).toBe("release/next")
  })

  it("names nothing when origin has no HEAD", () => {
    expect(remoteHeadBranchOf("")).toBeNull()
  })
})

describe("mainBranchOf", () => {
  it("picks the first existing of origin's main and master, then the local main and master", () => {
    expect(mainBranchOf("refs/heads/main\nrefs/remotes/origin/master\n")).toBe("master")
    expect(mainBranchOf("refs/heads/master\nrefs/heads/main\n")).toBe("main")
    expect(mainBranchOf("refs/heads/master\n")).toBe("master")
  })

  it("names nothing when the repository has neither main nor master", () => {
    expect(mainBranchOf("")).toBeNull()
  })
})
