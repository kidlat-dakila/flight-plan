/**
 * The function-like declarations in one file.
 *
 * A caller node is a *declaration* — the function a call sits inside — so the
 * climb needs every function-shaped declaration in a candidate file, with the
 * range of its name (what a symbol is keyed on) and the range of its body (what
 * a call site must fall within). The generic climb never sees a syntax node.
 *
 * What counts as a declaration at the top level of a file:
 *   - `function f() {}` — a function declaration, generators included.
 *   - `const f = () => {}` / `const f = function () {}` — a binding whose value
 *     is a function; `const x = 1` is not one, nor a generator expression.
 *   - `const f = client(…).action(async () => {})` — a binding built by a call
 *     chain that is handed a function: a server action, a wrapped handler. The
 *     function it is built from runs as `f`, so the whole chain is `f`'s body.
 *     A chain handed no function (`createClient({ url })`) is data, and so is
 *     an array or promise method handed one (`lines.filter((line) => …)`).
 *   - a class method `m() {}` and, in TypeScript, a class field holding a
 *     function `m = () => {}`, named `Class.m` so two methods called `m` stay
 *     distinct. A method's range starts after its decorators.
 * `export` wrapping any of these is unwrapped and does not change the shape.
 *
 * A named function declared straight in the body of one of these is one too,
 * named after the function holding it (`BasketForm.onSubmit`): a handler is where
 * a value is often fired, and it reads as its own card.
 * An ambient `declare`, an overload signature and an abstract member have no
 * body and are not declarations.
 */
import type { Range } from "../../types"
import { rangeBetween, rangeOf, skipTrivia, type Node, type Parsed } from "./estree"

/** One function-like declaration, before a file/symbol is attached to it. */
export type LocalDecl = {
  /** The written name; `Class.method` for a class member. */
  name: string
  /** The range of the name identifier. */
  definedAt: Range
  /** The range of the function itself — params and body — for containment. */
  enclosingRange: Range
}

/** A function *value*: the right side of `const f =`. A generator is not one. */
const isFunctionValue = (node: unknown): node is Node =>
  typeof node === "object" &&
  node !== null &&
  ((node as Node).type === "ArrowFunctionExpression" || (node as Node).type === "FunctionExpression") &&
  (node as Node).generator !== true

/**
 * Array and promise methods: handed a function, they return data, not a
 * function (`lines.filter((line) => …)`, `fetch(url).then((r) => …)`).
 */
const DATA_METHODS = new Set([
  "map", "filter", "reduce", "reduceRight", "find", "findLast", "findIndex", "findLastIndex",
  "some", "every", "sort", "toSorted", "flatMap", "forEach", "then", "catch", "finally",
])

/** The functions a call is handed, unless the call is a data method. */
const functionArguments = (call: Node): Node[] => {
  const callee = call.callee as Node
  const data = callee.type === "MemberExpression" && callee.computed !== true && DATA_METHODS.has((callee.property as Node).name as string)
  return data ? [] : (call.arguments as Node[]).filter(isFunctionValue)
}

/**
 * A call chain handed a function: `a(…)`, `a(…).b(…)`, down to its first callee,
 * with a function among the arguments of one of its calls.
 */
const isBuiltFunction = (node: unknown): boolean => {
  let at = node as Node | null
  while (at !== null && typeof at === "object") {
    if (at.type === "CallExpression") {
      if (functionArguments(at).length > 0) return true
      at = at.callee as Node
    } else if (at.type === "MemberExpression") {
      at = at.object as Node
    } else {
      return false
    }
  }
  return false
}

/** `export function f` wraps the real declaration; unwrap to it. */
const unwrap = (node: Node): Node | null =>
  node.type === "ExportNamedDeclaration" || node.type === "ExportDefaultDeclaration"
    ? ((node.declaration as Node | null) ?? null)
    : node

/** The written name of a binding and its range: the name alone, without a type annotation. */
function bindingName(parsed: Parsed, id: Node): { name: string; at: Range } {
  const end = id.type === "Identifier" ? id.start + (id.name as string).length : ((id.typeAnnotation as Node | undefined)?.start ?? id.end)
  const name = parsed.source.slice(id.start, end).trimEnd()
  return { name, at: rangeBetween(parsed, id.start, id.start + name.length) }
}

/** A class member's written name and its range; a computed name keeps its brackets. */
function memberName(parsed: Parsed, member: Node): { name: string; at: Range } {
  const key = member.key as Node
  if (member.computed !== true) return { name: parsed.source.slice(key.start, key.end), at: rangeOf(parsed, key) }
  const open = parsed.source.lastIndexOf("[", key.start)
  const close = parsed.source.indexOf("]", key.end) + 1
  return { name: parsed.source.slice(open, close), at: rangeBetween(parsed, open, close) }
}

/** Where a class member starts once its decorators are left out. */
function memberStart(parsed: Parsed, member: Node): number {
  const decorators = (member.decorators as Node[] | undefined) ?? []
  const last = decorators[decorators.length - 1]
  return last === undefined ? member.start : skipTrivia(parsed.source, last.end)
}

export function declarationsIn(parsed: Parsed): LocalDecl[] {
  const out: LocalDecl[] = []
  for (const statement of parsed.program.body as Node[]) {
    const decl = unwrap(statement)
    if (decl !== null) collect(parsed, decl, out, "")
  }
  return out
}

/** `owner.name`, or the name alone at the top of the file. */
const within = (owner: string, name: string): string => (owner === "" ? name : `${owner}.${name}`)

/**
 * The named functions declared straight in a function's body, as its own.
 *
 * `function f() {}` and `const f = () => {}` in the body, and what those hold
 * in turn, each named after the function holding it. An inline arrow has no
 * name to be read by and stays part of its function. For a built binding the
 * functions it is built from are its body.
 */
function nested(parsed: Parsed, owner: string, fn: Node, out: LocalDecl[]): void {
  if (isBuiltFunction(fn)) {
    for (let at: Node | null = fn; at !== null; ) {
      if (at.type === "CallExpression") {
        for (const argument of functionArguments(at)) nested(parsed, owner, argument, out)
        at = at.callee as Node
      } else at = at.type === "MemberExpression" ? (at.object as Node) : null
    }
    return
  }
  const body = fn.body as Node | null | undefined
  if (body?.type !== "BlockStatement") return
  for (const statement of body.body as Node[]) {
    if (statement.type === "FunctionDeclaration" || statement.type === "VariableDeclaration") collect(parsed, statement, out, owner)
  }
}

function collect(parsed: Parsed, decl: Node, out: LocalDecl[], owner: string): void {
  if (decl.declare === true) return
  switch (decl.type) {
    case "FunctionDeclaration": {
      const id = decl.id as Node | null
      if (id !== null) {
        const { name, at } = bindingName(parsed, id)
        out.push({ name: within(owner, name), definedAt: at, enclosingRange: rangeOf(parsed, decl) })
        nested(parsed, within(owner, name), decl, out)
      }
      return
    }
    case "VariableDeclaration": {
      for (const declarator of decl.declarations as Node[]) {
        const value = declarator.init as Node | null
        const built = (declarator.id as Node).type === "Identifier" && isBuiltFunction(value)
        if (!isFunctionValue(value) && !built) continue
        const { name, at } = bindingName(parsed, declarator.id as Node)
        out.push({ name: within(owner, name), definedAt: at, enclosingRange: rangeOf(parsed, value as Node) })
        nested(parsed, within(owner, name), value as Node, out)
      }
      return
    }
    case "ClassDeclaration": {
      const id = decl.id as Node | null
      if (id === null || owner !== "") return
      const className = id.name as string
      for (const member of (decl.body as Node).body as Node[]) memberOf(parsed, className, member, out)
      return
    }
  }
}

function memberOf(parsed: Parsed, className: string, member: Node, out: LocalDecl[]): void {
  const named = (name: string): string => (className === "" ? name : `${className}.${name}`)
  if (member.type === "MethodDefinition" && (member.value as Node).type === "FunctionExpression") {
    const { name, at } = memberName(parsed, member)
    out.push({ name: named(name), definedAt: at, enclosingRange: rangeBetween(parsed, memberStart(parsed, member), member.end) })
    nested(parsed, named(name), member.value as Node, out)
    return
  }
  // The JavaScript grammar keys a field on `property`, not `name`: its fields were never read.
  const field = member.type === "PropertyDefinition" || member.type === "AccessorProperty"
  if (field && parsed.grammar === "typescript" && isFunctionValue(member.value)) {
    const { name, at } = memberName(parsed, member)
    out.push({ name: named(name), definedAt: at, enclosingRange: rangeOf(parsed, member.value) })
    nested(parsed, named(name), member.value, out)
  }
}
