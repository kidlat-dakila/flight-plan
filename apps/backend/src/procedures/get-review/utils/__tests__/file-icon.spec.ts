import { fileIconOf } from "@/procedures/get-review/utils/file-icon"

describe("fileIconOf", () => {
  it("picks the icon of a file's language from its extension", () => {
    expect(fileIconOf("src/pokedex/main.py")).toStrictEqual({ kind: "python", label: "Python" })
    expect(fileIconOf("src/cart.mts")).toStrictEqual({ kind: "typescript", label: "TypeScript" })
    expect(fileIconOf("pyproject.toml")).toStrictEqual({ kind: "toml", label: "TOML" })
  })

  it("picks the framework a file's extension names", () => {
    expect(fileIconOf("src/App.tsx")).toStrictEqual({ kind: "react", label: "React" })
    expect(fileIconOf("src/Cart.vue")).toStrictEqual({ kind: "vue", label: "Vue" })
  })

  it("knows a Dockerfile by its name", () => {
    expect(fileIconOf("deploy/Dockerfile").kind).toBe("docker")
  })

  it("falls back to a plain file icon", () => {
    expect(fileIconOf("LICENSE")).toStrictEqual({ kind: "file", label: "File" })
    expect(fileIconOf("db/schema.sql").kind).toBe("file")
  })
})
