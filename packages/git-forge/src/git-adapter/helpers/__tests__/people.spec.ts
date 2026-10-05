import { describe, expect, it } from "vitest"
import { matchPeople, mergePeople, normalizeLogin } from "@/git-adapter/helpers/people"

describe("normalizeLogin", () => {
  it("drops a leading @ and ignores case and surrounding spaces", () => {
    expect(normalizeLogin(" @Mira ")).toBe("mira")
  })
})

describe("mergePeople", () => {
  it("keeps one person per login regardless of case, with the first login seen and gaps filled from later ones", () => {
    const merged = mergePeople([
      { login: "Mira", name: "Mira Sandoval", avatarUrl: "" },
      { login: "mira", avatarUrl: "https://avatars.test/mira.png" },
      { login: "teo", avatarUrl: "" },
    ])

    expect(merged).toStrictEqual([
      { login: "Mira", name: "Mira Sandoval", avatarUrl: "https://avatars.test/mira.png" },
      { login: "teo", avatarUrl: "" },
    ])
  })

  it("leaves out people without a login", () => {
    expect(mergePeople([{ login: "", avatarUrl: "" }])).toStrictEqual([])
  })
})

describe("matchPeople", () => {
  const people = [
    { login: "mira", name: "Mira Sandoval", avatarUrl: "" },
    { login: "teo-m", name: "Teo Marchetti", avatarUrl: "" },
    { login: "lena", avatarUrl: "" },
  ]

  it("matches the typed text against the login or the name, ignoring case", () => {
    expect(matchPeople(people, "SAND").map((person) => person.login)).toStrictEqual(["mira"])
    expect(matchPeople(people, "m").map((person) => person.login)).toStrictEqual(["mira", "teo-m"])
  })

  it("matches everyone when nothing is typed", () => {
    expect(matchPeople(people, "  ")).toHaveLength(3)
  })
})
