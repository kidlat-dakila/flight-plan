import { tsPlugin } from "@sveltejs/acorn-typescript"
import { analyze } from "@typescript-eslint/scope-manager"
import { parse as parseEstree } from "@typescript-eslint/typescript-estree"
import { Parser } from "acorn"
import { describe, expect, it } from "vitest"
import { parse, type Node } from "@/core/tracer/typescript/estree"

const TYPESCRIPT = `
import def, { named as renamed, type OnlyType } from "./a"
import * as ns from "./b"
import type { Whole } from "./c"
export { renamed as again }

// acorn-typescript does not read a decorator right after a \`declare\` with no semicolon.
declare const dec: (...args: unknown[]) => any;
declare const store: { get<T>(key: string): T };

@dec
export class Service<T extends object = {}> extends Base<T> implements Api<T>, Other {
  @dec field = 1
  @dec accessor held = def
  static count: number
  #secret = renamed
  constructor(@dec private readonly injected: T, public other?: ns.Thing) {
    super()
  }
  @dec method<U>(@dec value: U, ...rest: T[]): U { return value }
  get size(): number { return this.#secret }
  set size(next: number) {}
  overload(a: string): void
  overload(a: number): void
  overload(a: unknown): void {}
}

export abstract class Shape {
  abstract area(): number
  abstract name: string
}

interface Api<T> extends Base<T>, Record<string, T> {
  (call: T): void
  new (made: T): Api<T>
  method<U extends T>(input: U): typeof renamed
  readonly [key: string]: unknown
}

type Fn = <A>(a: A, b: typeof def) => A
type Ctor = abstract new (value: string) => Service<object>
type Mapped<T> = { readonly [K in keyof T as \`get\${string & K}\`]?: T[K] }
type Cond<T> = T extends Promise<infer U> ? U : never
type Query = typeof ns.value
type Imported = import("./d").Type<number>
type Tuple = [first: string, rest?: number]
type Guard = (value: unknown) => value is string

export const enum Color { Red = 1, Green = Red + 1 }
enum Plain { A, B = A }

namespace Outer.Inner {
  export const deep = renamed
}
declare module "external" {
  export function ext(): void
}
declare global {
  interface Window { flag: boolean }
}

function isString(value: unknown): value is string { return typeof value === "string" }
function assertIt(value: unknown): asserts value {}
function generic<const T extends readonly unknown[]>(items: T): T { return items }

export function use(input: OnlyType, whole: Whole) {
  const local = renamed satisfies unknown
  const cast = (def as unknown as Fn)<number>(1, def)
  const sure = store!.get<string>("k")
  const chained = store?.get?.<number>("n")
  label: for (const { a = local, ...others } of [input] as never[]) {
    if (others) continue label
  }
  const Klass = class<V> implements Other { v?: V }
  return [local, cast, sure, chained, Klass, isString, assertIt, generic, Color.Red, Plain.B, Outer.Inner.deep]
}
`

const TSX = `
import { Child } from "./child"
import * as ui from "./ui"
export function Page<T>({ items, onPick = () => {} }: { items: T[]; onPick?: (item: T) => void }) {
  return (
    <>
      <Child<T> items={items} onPick={onPick} {...{ extra: true }} />
      <ui.Panel open>{items.map((item) => <li key={String(item)} onClick={() => onPick(item)}>{item as never}</li>)}</ui.Panel>
    </>
  )
}
`

const JAVASCRIPT = `
import { helper } from "./helper"
export class Plain extends Base {
  field = helper
  method(value = helper, [first] = [], { deep } = {}, ...rest) { return value(first, deep, rest) }
}
export const render = ({ label }) => <b onClick={helper}>{label}</b>
`

const CASES: [string, string][] = [
  ["sample.ts", TYPESCRIPT],
  ["sample.tsx", TSX],
  ["sample.jsx", JAVASCRIPT],
  ["sample.js", JAVASCRIPT],
]

type AnalyzedProgram = Parameters<typeof analyze>[0]
type Positioned = (node: { start?: number, range?: [number, number] }) => number
type Resolved = ReturnType<typeof analyze>["scopes"][number]["references"][number]["resolved"]

const NOWHERE = -1
const startAt: Positioned = (node) => node.start ?? NOWHERE
const rangeStartAt: Positioned = (node) => node.range?.[0] ?? NOWHERE

const isProgram = (value: unknown): value is AnalyzedProgram =>
  typeof value === "object" && value !== null && "type" in value && value.type === "Program"

function targetOf(variable: Resolved, startOf: Positioned): string {
  if (variable === null) return "unresolved"
  return variable.defs.length === 0 ? `global ${variable.name}` : String(startOf(variable.defs[0].name))
}

function resolutions(program: unknown, startOf: Positioned): Map<number, string> {
  if (!isProgram(program)) throw new Error("not a program")
  const manager = analyze(program, { sourceType: "module" })
  return new Map(
    manager.scopes.flatMap((scope) =>
      scope.references.map((ref) => {
        const flags = `${ref.isRead() ? "r" : ""}${ref.isWrite() ? "w" : ""}${ref.isValueReference ? "v" : ""}${ref.isTypeReference ? "t" : ""}`
        return [startOf(ref.identifier), `${ref.identifier.name} -> ${targetOf(ref.resolved, startOf)} ${flags}`] as const
      }),
    ),
  )
}

function withQualifiedNamespace(resolved: ReadonlyMap<number, string>, source: string): Map<number, string> {
  const outer = source.indexOf("Outer.Inner.deep")
  return outer === -1 ? new Map(resolved) : new Map(resolved).set(outer, `Outer -> ${String(source.indexOf("Outer."))} rv`)
}

function parsed(file: string, source: string): Node {
  const one = parse(file, source)
  if (one === null) throw new Error(`${file} did not parse`)
  return one.program
}

describe("adapt", () => {
  for (const [file, source] of CASES) {
    it(`should resolve every reference in ${file} as typescript-estree's tree does`, () => {
      const ours = resolutions(parsed(file, source), startAt)
      const theirs = withQualifiedNamespace(resolutions(parseEstree(source, { range: true, jsx: !file.endsWith(".ts") }), rangeStartAt), source)

      expect(theirs.size).toBeGreaterThan(10)
      expect(Object.fromEntries(ours)).toStrictEqual(Object.fromEntries(theirs))
    })
  }

  it("should be what keeps the scope manager from crashing", () => {
    const raw = Parser.extend(tsPlugin()).parse(TYPESCRIPT, { ecmaVersion: "latest", sourceType: "module", ranges: true })
    expect(() => resolutions(raw, startAt)).toThrow("node.params is not iterable")
  })
})
