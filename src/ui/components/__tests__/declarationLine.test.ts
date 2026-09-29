import { describe, expect, test } from "vitest"
import { declarationLine } from "../Walkthrough"

/*
 * Where a `code:path#symbol` link points.
 *
 * The form the format asks authors to prefer, and until now the one form the
 * popup could say nothing about: symbols are resolved by grammar when a
 * document is stored, that range is not kept, and the reader got the whole file
 * from line one.
 *
 * A keyword in front of the name is what separates the declaration from the
 * call sites, and "exactly one match or nothing" is what keeps a wrong guess
 * off the screen — the same rule an anchor is repaired by.
 */
describe("declarationLine", () => {
  const file = [
    "import { parse } from './parse'",
    "",
    "export function parseFenceInfo(info: string) {",
    "  return parse(info)",
    "}",
    "",
    "const used = parseFenceInfo('ts')",
  ]

  test("finds the declaration rather than a call of the same name", () => {
    // Line 7 mentions it too, and is the answer a bare name search would give.
    expect(declarationLine(file, "parseFenceInfo")).toBe(3)
  })

  test("finds a declaration in each language's own words", () => {
    expect(declarationLine(["def render(self):"], "render")).toBe(1)
    expect(declarationLine(["func Render(w io.Writer) {"], "Render")).toBe(1)
    expect(declarationLine(["pub fn render(&self) {"], "render")).toBe(1)
    expect(declarationLine(["export const render = () => {}"], "render")).toBe(1)
    expect(declarationLine(["export type Render = {"], "Render")).toBe(1)
  })

  test("gives up when the name is declared twice", () => {
    // Overloads, or one name in two scopes. Either way this cannot say which
    // the link meant, and the whole file is the honest answer.
    expect(
      declarationLine(["function run(a: string) {}", "function run(a: number) {}"], "run"),
    ).toBeNull()
  })

  test("gives up on a form it does not know", () => {
    // A class method carries no keyword, so nothing matches and the caller
    // falls back rather than pointing at whatever was nearest.
    expect(declarationLine(["class A {", "  render() {}", "}"], "render")).toBeNull()
  })

  test("does not match a longer name that starts the same way", () => {
    expect(declarationLine(["function renderAll() {}"], "render")).toBeNull()
  })

  test("takes a symbol with regex characters as text", () => {
    // Whatever the author typed after the `#`, this is a search, not a pattern.
    expect(declarationLine(["const a = 1"], "a.*")).toBeNull()
    expect(declarationLine(["const a$b = 1"], "a$b")).toBe(1)
  })
})
