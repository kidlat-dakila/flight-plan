import { formatStoredPublications, parseStoredPublications } from "@/procedures/get-review/utils/stored-publications"

const PUBLICATIONS = [{ kind: "claude" as const, url: "https://claude.ai/artifact/abc123", publishedAt: new Date("2026-10-01T12:00:00.000Z") }]

describe("stored publications", () => {
  it("reads back what it wrote", () => {
    expect(parseStoredPublications(formatStoredPublications(PUBLICATIONS))).toStrictEqual(PUBLICATIONS)
  })

  it("reads text it does not understand as no publications", () => {
    expect(parseStoredPublications("not json")).toStrictEqual([])
    expect(parseStoredPublications("[{\"kind\":\"elsewhere\"}]")).toStrictEqual([])
  })
})
