import { parseCommitAuthors } from "@/procedures/search-repository-authors/utils/parse-commit-authors"

const SEPARATOR = "\u001F"

const logLine = (name: string, email: string): string => `${name}${SEPARATOR}${email}`

describe("parseCommitAuthors", () => {
  it("reads a name and an email from each line, newest first", () => {
    const output = [logLine("Lena Okafor", "lena@acme.example"), logLine("Dev Harper", "dev@acme.example")].join("\n")

    expect(parseCommitAuthors(output)).toStrictEqual([
      { id: "lena@acme.example", name: "Lena Okafor", detail: "lena@acme.example", avatarUrl: null },
      { id: "dev@acme.example", name: "Dev Harper", detail: "dev@acme.example", avatarUrl: null },
    ])
  })

  it("lists a person once, under the name of their latest commit", () => {
    const output = [logLine("Lena O.", "Lena@Acme.example"), logLine("Lena Okafor", "lena@acme.example")].join("\n")

    expect(parseCommitAuthors(output)).toStrictEqual([
      { id: "lena@acme.example", name: "Lena O.", detail: "lena@acme.example", avatarUrl: null },
    ])
  })

  it("skips empty lines and lines without an email", () => {
    const output = ["", logLine("Ghost", ""), "no separator here", logLine("Teo Marchetti", "teo@acme.example")].join("\n")

    expect(parseCommitAuthors(output).map((author) => author.name)).toStrictEqual(["Teo Marchetti"])
  })

  it("has nobody for an empty history", () => {
    expect(parseCommitAuthors("")).toStrictEqual([])
  })
})
