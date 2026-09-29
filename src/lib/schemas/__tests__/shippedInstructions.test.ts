import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { copyShippedInstructions, readShippedInstructions } from "../shippedInstructions"

/** The trees as the repository keeps them: `src/lib/schemas/`. */
const SOURCE_INSTRUCTION_ROOT = fileURLToPath(new URL("..", import.meta.url))

let dir: string

const write = (relPath: string, body: string) => {
  const target = path.join(dir, relPath)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, body)
}

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "fp-instructions-"))
})

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true })
})

describe("readShippedInstructions", () => {
  it("should read both trees, keyed by path relative to each", () => {
    write("default_instructions/blast/one.md", "how to write it")
    write("field_descriptions/meta/meta.md", "what it is")
    write("field_descriptions/meta/notes.txt", "not an instruction")

    const shipped = readShippedInstructions(dir)

    expect(shipped.instructions).toEqual({ "blast/one.md": "how to write it" })
    expect(shipped.descriptions).toEqual({ "meta/meta.md": "what it is" })
  })

  it("should refuse a root that has no instructions", () => {
    // A server that starts without them writes every document wrong and says
    // nothing, so the path it looked in has to be in the error.
    expect(() => readShippedInstructions(dir)).toThrow(dir)
  })

  it("should refuse a tree with no markdown in it", () => {
    write("default_instructions/blast/one.md", "how to write it")
    fs.mkdirSync(path.join(dir, "field_descriptions"))
    expect(() => readShippedInstructions(dir)).toThrow("field_descriptions")
  })

  it("should read the repository's own trees", () => {
    const shipped = readShippedInstructions(SOURCE_INSTRUCTION_ROOT)
    expect(shipped.descriptions["meta/meta.md"]).toBeTypeOf("string")
    expect(Object.keys(shipped.instructions).length).toBeGreaterThan(0)
  })
})

describe("copyShippedInstructions", () => {
  it("should copy both trees and drop files the source no longer has", () => {
    const to = path.join(dir, "server", "instructions")
    fs.mkdirSync(path.join(to, "default_instructions"), { recursive: true })
    fs.writeFileSync(path.join(to, "default_instructions", "withdrawn.md"), "old")

    copyShippedInstructions(SOURCE_INSTRUCTION_ROOT, to)

    const copied = readShippedInstructions(to)
    expect(copied).toEqual(readShippedInstructions(SOURCE_INSTRUCTION_ROOT))
    expect(copied.instructions["withdrawn.md"]).toBeUndefined()
  })

  it("should refuse to copy from a root that has no instructions", () => {
    expect(() => copyShippedInstructions(dir, path.join(dir, "out"))).toThrow(dir)
  })
})
