import * as fs from "node:fs/promises"
import * as os from "node:os"
import * as path from "node:path"
import { DEFAULT_SECTIONS } from "../../../lib/schemas/defaultProfile"
import { afterEach, beforeEach, describe, expect, test } from "vitest"
import { ProfileStore } from "../profiles"

let dir: string
let store: ProfileStore

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "fp-profiles-"))
  store = new ProfileStore(dir)
})

afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true })
})

describe("ProfileStore, fresh", () => {
  test("lists only the default profile and makes it active", async () => {
    expect(await store.list()).toEqual(["default"])
    expect(await store.activeName()).toBe("default")
  })

  test("default sections are all on", async () => {
    expect(await store.sections("default")).toEqual(DEFAULT_SECTIONS)
  })

  test("the default reader resolves shipped editable instructions", async () => {
    const read = await store.loadReader("default")
    expect(read("diagram/diagram.code.title.md")).toBeTypeOf("string")
  })

  test("refuses to edit the default profile", async () => {
    await expect(store.write("default", "title/title.md", "x")).rejects.toThrow()
    await expect(store.setSection("default", "blast", false)).rejects.toThrow()
    await expect(store.create("default")).rejects.toThrow()
  })
})

describe("ProfileStore, custom profile", () => {
  beforeEach(async () => {
    await store.create("mine")
  })

  const EDITABLE = "diagram/diagram.code.title.md"

  test("create copies the default set and lists it", async () => {
    expect(await store.list()).toEqual(["default", "mine"])
    const read = await store.loadReader("mine")
    // Copied verbatim from the default.
    expect(read(EDITABLE)).toBe((await store.loadReader("default"))(EDITABLE))
  })

  test("writing an instruction changes what the reader returns", async () => {
    await store.write("mine", EDITABLE, "My own diagram-title guidance.")
    const read = await store.loadReader("mine")
    expect(read(EDITABLE)).toBe("My own diagram-title guidance.")
  })

  test("a file the profile did not override falls back to the default", async () => {
    await fs.rm(path.join(dir, "mine", "diagram", "diagram.code.title.md"))
    const read = await store.loadReader("mine")
    expect(read(EDITABLE)).toBeTypeOf("string")
  })

  test("writing an enum option's meaning changes what the reader returns", async () => {
    const option = "findings/findings.node.kind.bug.md"
    expect(await store.loadReader("mine").then((read) => read(option))).toBeTypeOf("string")
    await store.write("mine", option, "My own bug.")
    expect((await store.loadReader("mine"))(option)).toBe("My own bug.")
  })

  test("refuses to write a static field (only editable instructions are writable)", async () => {
    await expect(store.write("mine", "title/title.md", "x")).rejects.toThrow()
  })

  test("toggling a section persists", async () => {
    await store.setSection("mine", "blast", false)
    expect(await store.sections("mine")).toEqual({ ...DEFAULT_SECTIONS, blast: false })
  })

  test("switching active profile persists", async () => {
    await store.setActive("mine")
    expect(await store.activeName()).toBe("mine")
  })

  test("refuses a duplicate or a reserved name", async () => {
    await expect(store.create("mine")).rejects.toThrow()
    await expect(store.create("default")).rejects.toThrow()
    await expect(store.create("has space")).rejects.toThrow()
  })
})
