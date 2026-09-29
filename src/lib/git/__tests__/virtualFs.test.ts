import fs, { readFileSync, statSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { afterEach, describe, expect, it } from "vitest"
import { mountVirtual, type Mounted } from "../virtualFs"

const ROOT = "/__test__/root"
const files = {
  names: new Set(["package.json", "src/a.ts", "src/lib/b.ts", "logo.png"]),
  contents: new Map([
    ["package.json", Buffer.from('{"name":"acme"}')],
    ["src/a.ts", Buffer.from("export const a = 1")],
    ["src/lib/b.ts", Buffer.from("")],
  ]),
}

let mounted: Mounted | null = null
afterEach(() => {
  mounted?.unmount()
  mounted = null
})

describe("mountVirtual", () => {
  it("serves the files, their folders and their contents under the root", () => {
    mounted = mountVirtual(ROOT, files)
    expect(fs.readFileSync(`${ROOT}/src/a.ts`, "utf8")).toBe("export const a = 1")
    expect(fs.readFileSync(`${ROOT}/src/lib/b.ts`, "utf8")).toBe("")
    expect(fs.statSync(`${ROOT}/src`).isDirectory()).toBe(true)
    expect(fs.statSync(`${ROOT}/src/a.ts`).isFile()).toBe(true)
    expect(fs.existsSync(`${ROOT}/src/missing.ts`)).toBe(false)
    expect(fs.statSync(`${ROOT}/src/missing.ts`, { throwIfNoEntry: false })).toBeUndefined()
    expect(() => fs.readFileSync(`${ROOT}/src/missing.ts`)).toThrow(/ENOENT/)
    expect(fs.readdirSync(ROOT)).toEqual(["logo.png", "package.json", "src"])
    expect(fs.readdirSync(`${ROOT}/src`, { withFileTypes: true }).map((one) => [one.name, one.isDirectory()])).toEqual([
      ["a.ts", false],
      ["lib", true],
    ])
    expect(fs.realpathSync(`${ROOT}/src/../src/a.ts`)).toBe(`${ROOT}/src/a.ts`)
    expect(() => fs.readlinkSync(`${ROOT}/src/a.ts`)).toThrow(/EINVAL/)
  })

  it("lists a folder recursively, as dependency-cruiser does to expand a path it reads as a glob", () => {
    mounted = mountVirtual(ROOT, files)
    expect(fs.readdirSync(`${ROOT}/src`, { recursive: true })).toEqual(["a.ts", "lib", "lib/b.ts"])
    expect(
      fs.readdirSync(ROOT, { recursive: true, withFileTypes: true }).map((one) => [one.parentPath, one.name, one.isDirectory()]),
    ).toEqual([
      [ROOT, "logo.png", false],
      [ROOT, "package.json", false],
      [ROOT, "src", true],
      [`${ROOT}/src`, "a.ts", false],
      [`${ROOT}/src`, "lib", true],
      [`${ROOT}/src/lib`, "b.ts", false],
    ])
  })

  it("answers the callback forms", async () => {
    mounted = mountVirtual(ROOT, files)
    const text = await new Promise((settle, fail) => fs.readFile(`${ROOT}/package.json`, "utf8", (error, value) => (error ? fail(error) : settle(value))))
    expect(text).toBe('{"name":"acme"}')
    const code = await new Promise((settle) => fs.stat(`${ROOT}/nothing`, (error) => settle(error?.code)))
    expect(code).toBe("ENOENT")
  })

  it("reaches a named import of node:fs too", () => {
    mounted = mountVirtual(ROOT, files)
    expect(readFileSync(`${ROOT}/src/a.ts`, "utf8")).toBe("export const a = 1")
    expect(statSync(`${ROOT}/src/lib`).isDirectory()).toBe(true)
  })

  it("leaves every other path to the real file system", () => {
    mounted = mountVirtual(ROOT, files)
    const self = fileURLToPath(import.meta.url)
    expect(fs.readFileSync(self, "utf8")).toContain("leaves every other path")
    expect(fs.existsSync(self)).toBe(true)
  })

  it("records a call it does not serve, and a file whose contents were not loaded", () => {
    mounted = mountVirtual(ROOT, files)
    expect(() => fs.openSync(`${ROOT}/src/a.ts`, "r")).toThrow()
    expect(() => fs.readFileSync(`${ROOT}/logo.png`)).toThrow(/EIO/)
    expect([...mounted.unhandled.keys()].sort()).toEqual(["openSync", "readFileSync (contents not loaded)"])
  })

  it("puts the real file system back, and mounts one root at a time", () => {
    mounted = mountVirtual(ROOT, files)
    expect(() => mountVirtual("/__test__/other", files)).toThrow(/already mounted/)
    mounted.unmount()
    mounted = null
    expect(fs.existsSync(`${ROOT}/src/a.ts`)).toBe(false)
    expect(() => readFileSync(`${ROOT}/src/a.ts`)).toThrow(/ENOENT/)
  })
})
