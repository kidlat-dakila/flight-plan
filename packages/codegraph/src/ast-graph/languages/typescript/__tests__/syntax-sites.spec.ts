import type { SourceRange, SyntaxSite } from "@/ast-graph"
import { SCRIPT_DIALECTS, sourceOf } from "@/ast-graph/languages/__tests__/script-files"

const WHOLE_FILE: SourceRange = { start: { line: 1, column: 0 }, end: { line: 99, column: 0 } }

const textAt = (source: string, { start, end }: SourceRange): string => {
  const lines = source.split("\n")
  return start.line === end.line ? lines[start.line - 1].slice(start.column, end.column) : `${lines[start.line - 1].slice(start.column)}…`
}

const isOfKind = <Kind extends SyntaxSite["kind"]>(kind: Kind) => (site: SyntaxSite): site is Extract<SyntaxSite, { kind: Kind }> => site.kind === kind

describe.each(SCRIPT_DIALECTS)("the syntax sites %s reads", (_name, { fileOf }) => {
  const sitesIn = <Kind extends SyntaxSite["kind"]>(source: string, kind: Kind): Extract<SyntaxSite, { kind: Kind }>[] =>
    fileOf(source).listSyntaxSitesIn(WHOLE_FILE).filter(isOfKind(kind))

  it("finds what is called, by a call and by new", () => {
    const source = sourceOf("const total = totalOf(order)", "const service = new OrderService()", "props.onSave()")

    expect(sitesIn(source, "callee").map((site) => textAt(source, site.range))).toStrictEqual(["totalOf", "OrderService", "props.onSave"])
  })

  it("finds each member read with its object and its property", () => {
    const source = "mutation.mutate(query.data)"

    expect(sitesIn(source, "member").map((site) => [textAt(source, site.object), site.property])).toStrictEqual([["mutation", "mutate"], ["query", "data"]])
  })

  it("finds the arguments of a call with what is called and a first argument written as text", () => {
    const source = sourceOf("router.post(\"/users\", createUser)", "save(user)")

    expect(sitesIn(source, "argument").map((site) => [site.callee, site.literal])).toStrictEqual([["router.post", "/users"], ["save", null]])
  })

  it("names what keeps the result of a call: a variable, a destructured object or an array", () => {
    const source = sourceOf(
      "const query = useQuery(options)",
      "const { data, execute: run } = await useSomeHook(save)",
      "const [state, setState] = useState(0)",
      "useEffect(sync)",
    )

    expect(sitesIn(source, "argument").map((site) => site.results.map((result) => result.name))).toStrictEqual([
      ["query"],
      ["data", "run"],
      ["state", "setState"],
      [],
    ])
  })

  it("says which call a function only wraps", () => {
    const source = sourceOf(
      "const direct = (user) => addUser(user)",
      "const returned = (user) => {",
      "  return addUser(user)",
      "}",
      "const awaited = async (user) => await addUser(user)",
      "const busy = (user) => {",
      "  validate(user)",
      "  addUser(user)",
      "}",
      "const value = (user) => user.name",
    )
    const wrapped = sitesIn(source, "function").map((site) => (site.wrapped === null ? null : textAt(source, site.wrapped)))

    expect(wrapped).toStrictEqual(["addUser", "addUser", "addUser", null, null])
  })

  it("reads the first parameter of a function as one name or as the properties it takes apart", () => {
    const source = sourceOf(
      "function SaveButton(props) {}",
      "const Editor = ({ onSave, label: text, size = 2 }) => null",
      "const single = item => item",
      "const none = () => null",
    )
    const parameters = sitesIn(source, "function").map((site) => [
      site.firstParameter?.name?.name ?? null,
      site.firstParameter?.properties.map(({ property, binding }) => `${property}=${binding.name}`) ?? null,
    ])

    expect(parameters).toStrictEqual([
      ["props", []],
      [null, ["onSave=onSave", "label=text", "size=size"]],
      ["item", []],
      [null, null],
    ])
  })

  it("finds what a variable keeps: the value, and the name or the properties it is bound to", () => {
    const source = sourceOf("const save = props.onSave", "const { onSave, label: text } = props", "let later")
    const kept = sitesIn(source, "kept").map((site) => [
      textAt(source, site.range),
      site.name?.name ?? null,
      site.properties.map(({ property, binding }) => `${property}=${binding.name}`),
    ])

    expect(kept).toStrictEqual([
      ["props.onSave", "save", []],
      ["props", null, ["onSave=onSave", "label=text"]],
    ])
  })
})
