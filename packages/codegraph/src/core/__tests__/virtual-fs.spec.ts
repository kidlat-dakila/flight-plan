import fs, { readFileSync, statSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { mountVirtual, type Mounted } from "@/core/virtual-fs"

const ROOT = "/__test__/root"
const files = {
  names: new Set(["package.json", "src/a.ts", "src/lib/b.ts", "logo.png"]),
  contents: new Map([
    ["package.json", Buffer.from("{\"name\":\"acme\"}")],
    ["src/a.ts", Buffer.from("export const a = 1")],
    ["src/lib/b.ts", Buffer.from("")],
  ]),
}

const whileMounted = <Seen>(see: (mounted: Mounted) => Seen): Seen => {
  const mounted = mountVirtual(ROOT, files)
  try {
    return see(mounted)
  } finally {
    mounted.unmount()
  }
}

const untilSettled = async <Seen>(see: (mounted: Mounted) => Promise<Seen>): Promise<Seen> => {
  const mounted = mountVirtual(ROOT, files)
  try {
    return await see(mounted)
  } finally {
    mounted.unmount()
  }
}

const readByCallback = async (at: string): Promise<string> =>
  await new Promise((settle, fail) => {
    fs.readFile(at, "utf8", (error, value) => {
      if (error === null) settle(value)
      else fail(error)
    })
  })

const statFailureCode = async (at: string): Promise<string | undefined> =>
  await new Promise((settle) => {
    fs.stat(at, (error) => {
      settle(error?.code)
    })
  })

describe("mountVirtual", () => {
  it("serves the files, their folders and their contents under the root", () => {
    whileMounted(() => {
      expect(fs.readFileSync(`${ROOT}/src/a.ts`, "utf8")).toBe("export const a = 1")
      expect(fs.readFileSync(`${ROOT}/src/lib/b.ts`, "utf8")).toBe("")
      expect(fs.statSync(`${ROOT}/src`).isDirectory()).toBe(true)
      expect(fs.statSync(`${ROOT}/src/a.ts`).isFile()).toBe(true)
      expect(fs.existsSync(`${ROOT}/src/missing.ts`)).toBe(false)
      expect(fs.statSync(`${ROOT}/src/missing.ts`, { throwIfNoEntry: false })).toBeUndefined()
      expect(() => fs.readFileSync(`${ROOT}/src/missing.ts`)).toThrow(/ENOENT/)
      expect(fs.readdirSync(ROOT)).toStrictEqual(["logo.png", "package.json", "src"])
      expect(fs.readdirSync(`${ROOT}/src`, { withFileTypes: true }).map((one) => [one.name, one.isDirectory()])).toStrictEqual([
        ["a.ts", false],
        ["lib", true],
      ])
      expect(fs.realpathSync(`${ROOT}/src/../src/a.ts`)).toBe(`${ROOT}/src/a.ts`)
      expect(() => fs.readlinkSync(`${ROOT}/src/a.ts`)).toThrow(/EINVAL/)
    })
  })

  it("lists a folder recursively, as dependency-cruiser does to expand a path it reads as a glob", () => {
    whileMounted(() => {
      expect(fs.readdirSync(`${ROOT}/src`, { recursive: true })).toStrictEqual(["a.ts", "lib", "lib/b.ts"])
      expect(
        fs.readdirSync(ROOT, { recursive: true, withFileTypes: true }).map((one) => [one.parentPath, one.name, one.isDirectory()]),
      ).toStrictEqual([
        [ROOT, "logo.png", false],
        [ROOT, "package.json", false],
        [ROOT, "src", true],
        [`${ROOT}/src`, "a.ts", false],
        [`${ROOT}/src`, "lib", true],
        [`${ROOT}/src/lib`, "b.ts", false],
      ])
    })
  })

  it("answers the callback forms", async () => {
    await untilSettled(async () => {
      expect(await readByCallback(`${ROOT}/package.json`)).toBe("{\"name\":\"acme\"}")
      expect(await statFailureCode(`${ROOT}/nothing`)).toBe("ENOENT")
    })
  })

  it("reaches a named import of node:fs too", () => {
    whileMounted(() => {
      expect(readFileSync(`${ROOT}/src/a.ts`, "utf8")).toBe("export const a = 1")
      expect(statSync(`${ROOT}/src/lib`).isDirectory()).toBe(true)
    })
  })

  it("leaves every other path to the real file system", () => {
    whileMounted(() => {
      const self = fileURLToPath(import.meta.url)
      expect(fs.readFileSync(self, "utf8")).toContain("leaves every other path")
      expect(fs.existsSync(self)).toBe(true)
    })
  })

  it("records a call it does not serve, and a file whose contents were not loaded", () => {
    whileMounted((mounted) => {
      expect(() => fs.openSync(`${ROOT}/src/a.ts`, "r")).toThrow(/ENOENT/)
      expect(() => fs.readFileSync(`${ROOT}/logo.png`)).toThrow(/EIO/)
      expect([...mounted.unhandled.keys()].sort()).toStrictEqual(["openSync", "readFileSync (contents not loaded)"])
    })
  })

  it("puts the real file system back, and mounts one root at a time", () => {
    whileMounted(() => {
      expect(() => mountVirtual("/__test__/other", files)).toThrow(/already mounted/)
    })
    expect(fs.existsSync(`${ROOT}/src/a.ts`)).toBe(false)
    expect(() => readFileSync(`${ROOT}/src/a.ts`)).toThrow(/ENOENT/)
  })
})
