import { findLibrary, listRepositoryConventions } from "@/catalogue/find-library"
import type { CatalogueLibrary } from "@/catalogue/types"

const react: CatalogueLibrary = {
  name: "React",
  specifiers: ["react", "react-dom"],
  documentedVersion: "19",
  category: "framework",
  type: "frontend",
  language: "javascript",
  patterns: [{ kind: "call", name: "useEffect", slots: [{ at: 0, runs: "effect" }] }],
}

const fileRoutes: CatalogueLibrary = {
  name: "File routes",
  specifiers: [],
  category: "framework",
  type: "fullstack",
  language: "javascript",
  patterns: [{ kind: "file", glob: "app/**/page.tsx", exports: [{ name: "default", runs: "page" }] }],
}

describe("findLibrary", () => {
  it("finds a library by the specifier it is imported by", () => {
    expect(findLibrary([fileRoutes, react], "react", "javascript")).toBe(react)
  })

  it("finds a library by any of its specifiers", () => {
    expect(findLibrary([fileRoutes, react], "react-dom", "javascript")).toBe(react)
  })

  it("finds nothing for a specifier no library has", () => {
    expect(findLibrary([fileRoutes, react], "vue", "javascript")).toBeNull()
  })

  it("finds a library of any language when no language is given", () => {
    expect(findLibrary([fileRoutes, react], "react")).toBe(react)
  })

  it("finds nothing for a specifier of a library of another language", () => {
    expect(findLibrary([fileRoutes, react], "react", "python")).toBeNull()
  })
})

describe("listRepositoryConventions", () => {
  it("lists the libraries that are imported by no specifier", () => {
    expect(listRepositoryConventions([fileRoutes, react])).toStrictEqual([fileRoutes])
  })
})
