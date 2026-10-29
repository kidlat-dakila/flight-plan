import { parseWithGrammar } from "@/ast-graph/parser"
import { codeOf } from "@/code-blocks/__tests__/group-fixture"
import { readPythonBlocks } from "@/code-blocks/languages/python/blocks"
import { readPythonOutline, type PythonOutline } from "@/code-blocks/languages/python/outline"
import { readPythonUses } from "@/code-blocks/languages/python/uses"
import { createFileNaming } from "@/code-blocks/languages/typescript/named-by"

const FILE_PATH = "shop/config.py"
const DEPTH = 20
const TERMS = 20
const FIRST_TERM_COLUMN = 12
const TERM_WIDTH = " + a".length

const levels = (count: number, make: (level: number) => string): string[] => Array.from({ length: count }, (_, level) => make(level))

const outlineOfCode = (...lines: readonly string[]): PythonOutline => readPythonOutline(parseWithGrammar("python", codeOf(...lines)), new Map())

const keyPathsOf = (...lines: readonly string[]): string[] =>
  readPythonBlocks({ filePath: FILE_PATH, outline: outlineOfCode(...lines), naming: createFileNaming([]), findExport: () => null })
    .filter((block) => block.type === "property")
    .map((block) => `${block.name ?? ""} ${(block.memberPath ?? []).join(".")}`)

const usesOf = (...lines: readonly string[]): string[] =>
  readPythonUses(outlineOfCode(...lines)).map(({ use, memberPath, usedAt }) =>
    [use, memberPath.join("."), `${String(usedAt.start.line)}:${String(usedAt.start.column)}`].filter((part) => part !== "").join(" "))

describe("the key path of a property of a Python dictionary", () => {
  it("holds every key written as text from the root of the dictionary down, at any depth", () => {
    const nested = `${levels(DEPTH, (level) => `{'k${String(level)}': `).join("")}1${"}".repeat(DEPTH)}`
    const paths = keyPathsOf(`CONFIG = ${nested}`)

    expect(paths).toHaveLength(DEPTH)
    expect(paths[DEPTH - 1]).toBe(`k${String(DEPTH - 1)} ${levels(DEPTH, (level) => `k${String(level)}`).join(".")}`)
  })

  it("starts again below a key that is not plain text, and below a dictionary that a comprehension makes", () => {
    expect(keyPathsOf(
      "A = {'a': {f'x{y}': {'c': 2}, 'd': {k: {'e': 3} for k in z}}, 'f': [{'g': 4}], 'i': lambda: {'j': 6}}",
      "B = {'x': {'y': {'w': 1}} for k in z}",
      "C = {**base, 'o': {'p': 1}}",
    )).toStrictEqual(["a a", "c c", "d a.d", "e e", "f f", "g g", "j j", "y x.y", "w x.y.w", "o o", "p o.p"])
  })
})

describe("the uses of a name in a Python annotation and in a long expression", () => {
  it("names a type in an annotation, and a value in a call inside it or in a sum of many terms", () => {
    expect(usesOf(
      "from typing import Annotated",
      "class Box:",
      "    pass",
      "def make():",
      "    return 1",
      "def pack(a: Box, b: Annotated[Box, Depends(make)], c: list[Box]) -> Box:",
      `    return ${levels(TERMS, () => "a").join(" + ")}`,
    )).toStrictEqual([
      "type 6:13",
      "type 6:21",
      "type 6:31",
      "value 6:44",
      "type 6:60",
      "type 6:69",
      ...levels(TERMS, (term) => `value 7:${String(FIRST_TERM_COLUMN + term * TERM_WIDTH)}`),
    ])
  })

  it("reads the keys of a dictionary through subscripts and get calls, in the order they are written", () => {
    expect(usesOf(
      "CONFIG = {'db': {'host': {'port': 1}}}",
      "def port():",
      "    return CONFIG['db'].get('host')['port']",
    )).toStrictEqual(["call db.get 3:12", "read db.host.port 3:12"])
  })
})
