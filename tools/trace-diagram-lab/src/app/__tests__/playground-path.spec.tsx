import { chosenPlaygroundOf, isPlaygroundPath, playgroundGroupsOf, playgroundPagePathOf, playgroundRouteOf, redirectPathOf } from "@/app/playground-path"

const playgroundOf = (language: string, framework: string) => ({ id: `${language}/${framework}`, language, framework })

const PLAYGROUNDS = [
  playgroundOf("python", "base"),
  playgroundOf("python", "fastapi"),
  playgroundOf("typescript", "base"),
  playgroundOf("typescript", "react"),
  playgroundOf("typescript", "vue"),
]

describe("isPlaygroundPath", () => {
  it("knows the playground paths from every other path", () => {
    expect(isPlaygroundPath("/playground")).toBe(true)
    expect(isPlaygroundPath("/playground/")).toBe(true)
    expect(isPlaygroundPath("/playground/typescript/react")).toBe(true)
    expect(isPlaygroundPath("/")).toBe(false)
    expect(isPlaygroundPath("/playgrounds")).toBe(false)
    expect(isPlaygroundPath("/api/playgrounds")).toBe(false)
  })
})

describe("playgroundRouteOf", () => {
  it("reads the language and the framework of the path", () => {
    expect(playgroundRouteOf("/playground/typescript/react")).toStrictEqual({ language: "typescript", framework: "react" })
    expect(playgroundRouteOf("/playground/typescript/react/")).toStrictEqual({ language: "typescript", framework: "react" })
  })

  it("reads what is missing as null", () => {
    expect(playgroundRouteOf("/playground/python")).toStrictEqual({ language: "python", framework: null })
    expect(playgroundRouteOf("/playground")).toStrictEqual({ language: null, framework: null })
  })
})

describe("chosenPlaygroundOf", () => {
  it("chooses the playground of the language and framework", () => {
    expect(chosenPlaygroundOf(PLAYGROUNDS, { language: "typescript", framework: "vue" })?.id).toBe("typescript/vue")
  })

  it("falls back to the first playground of the language, then to the first of all", () => {
    expect(chosenPlaygroundOf(PLAYGROUNDS, { language: "typescript", framework: null })?.id).toBe("typescript/base")
    expect(chosenPlaygroundOf(PLAYGROUNDS, { language: "typescript", framework: "missing" })?.id).toBe("typescript/base")
    expect(chosenPlaygroundOf(PLAYGROUNDS, { language: "missing", framework: "react" })?.id).toBe("python/base")
    expect(chosenPlaygroundOf(PLAYGROUNDS, { language: null, framework: null })?.id).toBe("python/base")
  })

  it("chooses nothing from no playgrounds", () => {
    expect(chosenPlaygroundOf([], { language: "typescript", framework: "react" })).toBeNull()
  })
})

describe("redirectPathOf", () => {
  it("redirects a path to the page of the playground it shows", () => {
    expect(redirectPathOf("/playground", PLAYGROUNDS[0])).toBe("/playground/python/base")
    expect(redirectPathOf("/playground/typescript/react/", PLAYGROUNDS[3])).toBe("/playground/typescript/react")
  })

  it("leaves the path of the shown playground, or of no playground, as it is", () => {
    expect(redirectPathOf(playgroundPagePathOf("typescript/react"), PLAYGROUNDS[3])).toBeNull()
    expect(redirectPathOf("/playground/typescript", null)).toBeNull()
  })
})

describe("playgroundGroupsOf", () => {
  it("groups the playgrounds by language, in the order they come", () => {
    expect(playgroundGroupsOf(PLAYGROUNDS).map(({ language, playgrounds }) => ({ language, ids: playgrounds.map((playground) => playground.id) }))).toStrictEqual([
      { language: "python", ids: ["python/base", "python/fastapi"] },
      { language: "typescript", ids: ["typescript/base", "typescript/react", "typescript/vue"] },
    ])
  })
})
