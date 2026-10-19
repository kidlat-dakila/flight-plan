import { textAt, withoutDefault } from "@/trace/parameters"
import type { SourceFile } from "@flightplan/configurations"

const sourceOf = (lines: readonly string[]): SourceFile => ({
  path: "shop/service.py",
  language: "python",
  lines: lines.map((text, index) => ({ text, mark: "context", number: index + 1 })),
  declarations: {},
  references: [],
  languageReferences: [],
  exports: [],
})

describe("the text of a parameter on its card", () => {
  it("keeps the name and the type, and leaves out a default value", () => {
    expect(withoutDefault("session: Session")).toBe("session: Session")
    expect(withoutDefault("trainer_id: int | None = None")).toBe("trainer_id: int | None")
    expect(withoutDefault("init: RequestInit = {}")).toBe("init: RequestInit")
  })

  it("keeps an arrow, a comparison and an equals sign inside brackets as part of the type", () => {
    expect(withoutDefault("onSave: (draft: Draft) => void")).toBe("onSave: (draft: Draft) => void")
    expect(withoutDefault("check: Callable[[int], bool] = lambda n: n == 1")).toBe("check: Callable[[int], bool]")
    expect(withoutDefault("options: Options = { retry: (n = 1) => n }")).toBe("options: Options")
  })

  it("joins a parameter written over several lines into one line", () => {
    expect(withoutDefault("{\n  onApplied,\n  code\n}: Props")).toBe("{ onApplied, code }: Props")
  })

  it("cuts the parameter out of the lines its range covers", () => {
    const source = sourceOf(["def list_pokemon(session: Session, trainer_id: int | None = None):", "    return []"])

    expect(textAt(source, { start: { line: 1, column: 18 }, end: { line: 1, column: 34 } })).toBe("session: Session")
    expect(textAt(source, { start: { line: 1, column: 36 }, end: { line: 1, column: 65 } })).toBe("trainer_id: int | None = None")
    expect(textAt(source, { start: { line: 4, column: 1 }, end: { line: 4, column: 5 } })).toBeNull()
  })
})
