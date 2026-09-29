/**
 * The forward value-flow pass for Python: where does the changed function get
 * invoked when it is handed around as a *value* rather than called by name?
 *
 * The call graph ({@link ./callGraph}) answers "who writes `name(...)`". That
 * misses every indirection where the function travels as a value first — through
 * an alias, a route decorator, a callback argument, a collection, a return, a
 * framework registration — before it is finally called. This pass follows the
 * *value* forward from the change to every terminal call or sink, and marks
 * every point where the value escapes static resolution.
 *
 * It mirrors `tracer/typescript/valueFlow.ts` in structure — the worklist, the
 * `handoff` boolean that flips `via` from `"call"` to `"value"`, the
 * accumulators and dedupe — with Python's own patterns (route decorators,
 * framework sinks, stores, buses) replacing the JSX/hook branches.
 *
 * It is deliberately conservative in one direction: **follow the function, never
 * data, and never miss silently.** A binding that turns out to be data reaches no
 * call and is pruned; a binding whose value crosses a boundary the trace cannot
 * follow (a spread, a store, a computed dispatch, a wrapping decorator, a dynamic
 * import) emits an escape marker rather than stopping quietly.
 */
import type { Node, Tree } from "web-tree-sitter"
import type { CallCandidates } from "../language"
import type { CodeRef, EscapeKind, Range } from "../../types"
import type { Resolver } from "./callGraph"
import { declarationsIn } from "./declarations"
import { importBindingsOf } from "./imports"

/** One place the changed function is ultimately invoked. */
export type Invocation = {
  /** The declaration the invocation sits inside — the node adjacent to the change. */
  code: CodeRef
  /** Where the invocation is written, in that declaration's file. */
  calledAt: Range
  /** `call` for a plain `name()`; `value` for a handoff (decorator / callback / collection / return / sink). */
  via: "call" | "value"
}

/** One boundary where the value left static reach. */
export type Escape = { reason: EscapeKind; at: Range; file: string }

export type ValueFlow = { invocations: Invocation[]; escapes: Escape[] }

/** Decorators (by their head name) treated as a framework invocation sink — the decorator invokes the function. */
const ROUTE_DECORATORS = new Set(["route", "get", "post", "put", "delete", "patch", "command", "task", "get_route"])
/** Free-function / member registration sinks whose function argument is invoked (URL routes / argparse / click). */
const ROUTE_FUNCS = new Set(["path", "re_path", "url", "add_url_rule", "add_command", "set_defaults"])
/** Member-call methods treated as putting a value into a store / registry. */
const STORE_METHODS = new Set(["register", "add", "append", "setdefault", "__setitem__"])
/** Member-call methods treated as an event-bus / signal registration. */
const BUS_METHODS = new Set(["connect", "subscribe", "on", "listen", "add_handler", "signal"])
/** Member-call methods treated as a dynamic import boundary. */
const IMPORT_METHODS = new Set(["import_module"])
/** Decorators that do not wrap the callable into an opaque new one — the function is still reached normally. */
const TRANSPARENT_DECORATORS = new Set([
  "staticmethod",
  "classmethod",
  "property",
  "cached_property",
  "abstractmethod",
  "abstractproperty",
  "final",
  "override",
])

const rangeOf = (node: Node): Range => ({
  start: { line: node.startPosition.row + 1, column: node.startPosition.column },
  end: { line: node.endPosition.row + 1, column: node.endPosition.column },
})

/** Node identity: web-tree-sitter hands back fresh wrappers, so compare by `id`. */
const same = (a: Node | null | undefined, b: Node | null | undefined): boolean =>
  a !== null && a !== undefined && b !== null && b !== undefined && a.id === b.id

const area = (r: Range): number => (r.end.line - r.start.line) * 1e6 + (r.end.column - r.start.column)
const atOrAfter = (a: { line: number; column: number }, b: { line: number; column: number }): boolean =>
  a.line > b.line || (a.line === b.line && a.column >= b.column)
const contains = (outer: Range, at: Range): boolean =>
  atOrAfter(at.start, outer.start) && atOrAfter(outer.end, at.start)

/** The tightest declaration whose body contains a position. */
const enclosing = (decls: readonly CodeRef[], at: Range): CodeRef | undefined => {
  let best: CodeRef | undefined
  for (const decl of decls) {
    if (!contains(decl.enclosingRange, at)) continue
    if (best === undefined || area(decl.enclosingRange) < area(best.enclosingRange)) best = decl
  }
  return best
}

/** Every `identifier` node in a tree whose text is `name`. */
function identifiersNamed(tree: Tree, name: string): Node[] {
  const out: Node[] = []
  const visit = (node: Node): void => {
    if (node.type === "identifier" && node.text === name) out.push(node)
    for (const child of node.namedChildren) if (child !== null) visit(child)
  }
  visit(tree.rootNode)
  return out
}

/** Whether a node sits inside an import (`import a` or `from a import b`). */
const inImport = (node: Node): boolean => {
  for (let p = node.parent; p !== null; p = p.parent) {
    if (p.type === "import_statement" || p.type === "import_from_statement") return true
  }
  return false
}

/** Whether a node has a `function_definition` ancestor (i.e. it is not module-level). */
const insideFunction = (node: Node): boolean => {
  for (let p = node.parent; p !== null; p = p.parent) if (p.type === "function_definition") return true
  return false
}

/** The names an assignment target binds (`a = f()` → `[a]`, `a, b = f()` → `[a, b]`). */
function boundNames(pattern: Node): string[] {
  if (pattern.type === "identifier") return [pattern.text]
  if (pattern.type === "pattern_list" || pattern.type === "tuple_pattern" || pattern.type === "tuple") {
    return pattern.namedChildren
      .filter((child): child is Node => child !== null && child.type === "identifier")
      .map((child) => child.text)
  }
  return []
}

/** The assignment a node is the `right` value of, if any (`x = <node>`). */
const assignmentFor = (node: Node): Node | null =>
  node.parent?.type === "assignment" && same(node.parent.childForFieldName("right"), node) ? node.parent : null

/** The head name of a decorator expression: `@route` → `route`, `@app.route(...)` → `route`. */
function decoratorHead(node: Node | null): string {
  if (node === null) return ""
  if (node.type === "identifier") return node.text
  if (node.type === "attribute") return node.childForFieldName("attribute")?.text ?? ""
  if (node.type === "call") return decoratorHead(node.childForFieldName("function"))
  return ""
}

export async function traceValueFlow(
  resolver: Resolver,
  candidates: CallCandidates,
  target: CodeRef,
): Promise<ValueFlow> {
  const invocations: Invocation[] = []
  const escapes: Escape[] = []
  const seenInv = new Set<string>()
  const seenEsc = new Set<string>()

  const addInvocation = (code: CodeRef, calledAt: Range, via: "call" | "value", allowSelf = false): void => {
    // A declaration is never its own invoker (a recursive reference to the change),
    // unless a framework/decorator invokes the target itself at module scope.
    if (
      !allowSelf &&
      code.file === target.file &&
      code.definedAt.start.line === target.definedAt.start.line
    ) {
      return
    }
    const key = `${code.file}:${String(code.definedAt.start.line)}:${via}`
    if (seenInv.has(key)) return
    seenInv.add(key)
    invocations.push({ code, calledAt, via })
  }
  const addEscape = (reason: EscapeKind, at: Range, file: string): void => {
    const key = `${file}:${String(at.start.line)}:${String(at.start.column)}:${reason}`
    if (seenEsc.has(key)) return
    seenEsc.add(key)
    escapes.push({ reason, at, file })
  }

  /** Attribute a framework registration to the enclosing declaration, or to the target itself at module scope. */
  const registerSink = (decls: readonly CodeRef[], callRange: Range, at: Range): void => {
    const site = enclosing(decls, callRange)
    if (site !== undefined) addInvocation(site, at, "value")
    else addInvocation(target, at, "value", true)
  }

  /** Resolve a callee name in a file to a repo file, or null when external. */
  const resolveName = async (file: string, name: string): Promise<string | null> => {
    const tree = await resolver.treeOf(file)
    if (tree === null) return null
    for (const decl of declarationsIn(tree)) {
      if (decl.name === name || decl.name.endsWith(`.${name}`)) return file
    }
    for (const binding of importBindingsOf(tree)) {
      if (binding.local !== name || binding.typeOnly) continue
      return resolver.resolveModule(file, binding.module, binding.level, binding.imported)
    }
    return null
  }

  /** The parameter name at an index of a repo function, for descending into a callee. */
  const paramNameAt = async (file: string, name: string, index: number): Promise<string | null> => {
    const tree = await resolver.treeOf(file)
    if (tree === null) return null
    const params = findParams(tree.rootNode, name)
    const param = params?.namedChildren[index] ?? null
    if (param === null) return null
    return paramName(param)
  }

  /** Whether a repo function has a parameter of the given name (for a keyword descend). */
  const hasParamNamed = async (file: string, name: string, param: string): Promise<boolean> => {
    const tree = await resolver.treeOf(file)
    if (tree === null) return false
    const params = findParams(tree.rootNode, name)
    return (params?.namedChildren ?? []).some((p) => p !== null && paramName(p) === param)
  }

  /** Whether a repo function absorbs unmatched keyword arguments through a `**kwargs` parameter. */
  const absorbsKwargs = async (file: string, name: string): Promise<boolean> => {
    const tree = await resolver.treeOf(file)
    if (tree === null) return false
    const params = findParams(tree.rootNode, name)
    return (params?.namedChildren ?? []).some((p) => p !== null && p.type === "dictionary_splat_pattern")
  }

  const seen = new Set<string>()
  const work: (() => Promise<void>)[] = []
  const queueBinding = (file: string, name: string, handoff: boolean): void => {
    const key = `b:${file}:${name}:${String(handoff)}`
    if (seen.has(key)) return
    seen.add(key)
    work.push(() => analyzeBinding(file, name, handoff))
  }
  const queueCollection = (file: string, name: string): void => {
    const key = `c:${file}:${name}`
    if (seen.has(key)) return
    seen.add(key)
    work.push(() => analyzeCollection(file, name))
  }
  const queueReturns = (fn: CodeRef): void => {
    const key = `r:${fn.file}:${String(fn.definedAt.start.line)}`
    if (seen.has(key)) return
    seen.add(key)
    work.push(() => analyzeReturns(fn))
  }

  /** A binding that holds the value: follow every use forward. */
  async function analyzeBinding(file: string, name: string, handoff: boolean): Promise<void> {
    const tree = await resolver.treeOf(file)
    if (tree === null) return
    const decls = await resolver.declarationsOf(file)
    for (const ref of identifiersNamed(tree, name)) {
      if (inImport(ref)) continue
      const parent = ref.parent
      if (parent === null) continue

      // `def name(...)` — the declaration site of the function itself.
      if (parent.type === "function_definition" && same(parent.childForFieldName("name"), ref)) continue

      // `name(...)` — a terminal call.
      if (parent.type === "call" && same(parent.childForFieldName("function"), ref)) {
        const at = enclosing(decls, rangeOf(ref))
        if (at !== undefined) addInvocation(at, rangeOf(ref), handoff ? "value" : "call")
        continue
      }

      // `@name` — used as a bare decorator: `other = name(other)`, so the function
      // is invoked as a value at the decoration site. (`@name(...)` is a decorator
      // factory whose identifier parent is a `call`, already handled above.)
      if (parent.type === "decorator") {
        const at = rangeOf(ref)
        const site = enclosing(decls, at)
        if (site !== undefined) addInvocation(site, at, "value")
        else addEscape("decorator", at, file)
        continue
      }

      // `left = name` — an assignment (an alias to follow, or a store escape).
      if (parent.type === "assignment" && same(parent.childForFieldName("right"), ref)) {
        const left = parent.childForFieldName("left")
        if (left?.type === "attribute") {
          // `self.x = name` / `mod.x = name` — stored on an object.
          addEscape("store", rangeOf(ref), file)
        } else if (left?.type === "identifier" && !insideFunction(parent)) {
          // A module-level global that may be imported elsewhere — a boundary.
          addEscape("store", rangeOf(ref), file)
        } else if (left !== null) {
          for (const b of boundNames(left)) queueBinding(file, b, handoff)
        }
        continue
      }

      // `return name` — the value leaves as the enclosing function's result.
      if (parent.type === "return_statement") {
        const fn = enclosing(decls, rangeOf(ref))
        if (fn !== undefined) queueReturns(fn)
        continue
      }

      // `*name` / `**name` — spread of the callable: the trace cannot follow it.
      if (parent.type === "list_splat" || parent.type === "dictionary_splat") {
        addEscape("spread", rangeOf(ref), file)
        continue
      }

      // `f(name)` — a positional call argument.
      if (parent.type === "argument_list" && parent.parent?.type === "call") {
        await handleArg(file, decls, ref, parent.parent, parent, null)
        continue
      }
      // `f(kw=name)` — a keyword call argument.
      if (
        parent.type === "keyword_argument" &&
        same(parent.childForFieldName("value"), ref) &&
        parent.parent?.type === "argument_list" &&
        parent.parent.parent?.type === "call"
      ) {
        const kw = parent.childForFieldName("name")?.text ?? null
        await handleArg(file, decls, ref, parent.parent.parent, parent.parent, kw)
        continue
      }

      // `[name]` / `{ k: name }` — inserted into a collection literal.
      if (parent.type === "list" || parent.type === "set" || parent.type === "tuple") {
        const assignment = assignmentFor(parent)
        const bound = assignment?.childForFieldName("left")
        if (bound?.type === "identifier") queueCollection(file, bound.text)
        continue
      }
      if (parent.type === "pair" && same(parent.childForFieldName("value"), ref)) {
        const assignment = assignmentFor(parent.parent as Node)
        const bound = assignment?.childForFieldName("left")
        if (bound?.type === "identifier") queueCollection(file, bound.text)
        continue
      }
      // Any other use (member receiver, arithmetic) is data — ignore.
    }
  }

  /** The value passed as an argument of a call — a sink, a descend, or an escape. */
  async function handleArg(
    file: string,
    decls: readonly CodeRef[],
    ref: Node,
    call: Node,
    args: Node,
    keyword: string | null,
  ): Promise<void> {
    const callee = call.childForFieldName("function")
    if (callee === null) return
    const at = rangeOf(ref)

    // A member call: a framework sink, a store / bus / import boundary, or a library.
    if (callee.type === "attribute") {
      const prop = callee.childForFieldName("attribute")?.text ?? ""
      const receiver = callee.childForFieldName("object")?.text ?? ""
      if (ROUTE_FUNCS.has(prop)) registerSink(decls, rangeOf(call), at)
      else if (IMPORT_METHODS.has(prop) || receiver === "importlib") addEscape("import", at, file)
      else if (STORE_METHODS.has(prop)) addEscape("store", at, file)
      else if (BUS_METHODS.has(prop)) addEscape("event-bus", at, file)
      else addEscape("library", at, file)
      return
    }
    if (callee.type !== "identifier") return

    // A free-function framework sink (`path(...)`) or a dynamic import.
    if (ROUTE_FUNCS.has(callee.text)) {
      registerSink(decls, rangeOf(call), at)
      return
    }
    if (callee.text === "__import__") {
      addEscape("import", at, file)
      return
    }

    const to = await resolveName(file, callee.text)
    if (to === null) {
      // An un-indexed callee: a library / external wrapper.
      addEscape("library", at, file)
      return
    }

    // A keyword argument names the callee's parameter directly.
    if (keyword !== null) {
      if (await hasParamNamed(to, callee.text, keyword)) {
        queueBinding(to, keyword, true)
      } else {
        // No named parameter matches: the callee absorbs the value through
        // `**kwargs` (a spread boundary) — or the resolution is imperfect. Either
        // way the value may still be invoked inside `to`, so mark the boundary
        // rather than dropping the reach silently.
        addEscape((await absorbsKwargs(to, callee.text)) ? "spread" : "library", at, file)
      }
      return
    }

    const declarator = assignmentFor(call)
    const resultNames = declarator ? boundNames(declarator.childForFieldName("left") as Node) : []
    if (resultNames.length > 0) {
      // The value went in and a wrapper came back: follow every result binding.
      for (const n of resultNames) queueBinding(file, n, true)
      return
    }
    // The value becomes the callee's parameter: descend into it.
    const index = args.namedChildren.filter((c) => c !== null).findIndex((c) => same(c, ref))
    const param = await paramNameAt(to, callee.text, index)
    if (param !== null) queueBinding(to, param, true)
  }

  /** A collection that holds the value: a static index-call reaches it; a computed one escapes. */
  async function analyzeCollection(file: string, name: string): Promise<void> {
    const tree = await resolver.treeOf(file)
    if (tree === null) return
    const decls = await resolver.declarationsOf(file)
    for (const ref of identifiersNamed(tree, name)) {
      if (inImport(ref)) continue
      const parent = ref.parent
      if (parent === null) continue
      if (parent.type === "assignment" && same(parent.childForFieldName("left"), ref)) continue

      // `coll[...]()` — a subscript call: static index reaches it, computed index escapes.
      if (parent.type === "subscript" && same(parent.childForFieldName("value"), ref)) {
        const call = parent.parent
        if (call?.type !== "call" || !same(call.childForFieldName("function"), parent)) continue
        const index = parent.childForFieldName("subscript")
        const at = rangeOf(parent)
        if (index?.type === "integer" || index?.type === "string") {
          const site = enclosing(decls, at)
          if (site !== undefined) addInvocation(site, at, "value")
          else addInvocation(target, at, "value", true)
        } else {
          addEscape("dynamic-dispatch", at, file)
        }
        continue
      }
      // `*coll` — the collection is spread; the value is lost.
      if (parent.type === "list_splat" || parent.type === "dictionary_splat") {
        addEscape("spread", rangeOf(ref), file)
      }
    }
  }

  /** A function that returns the value: a caller that immediately calls its result reaches it. */
  async function analyzeReturns(fn: CodeRef): Promise<void> {
    for (const file of await candidates(fn)) {
      const tree = await resolver.treeOf(file)
      if (tree === null) continue
      const decls = await resolver.declarationsOf(file)
      for (const search of await resolver.localNamesFor(file, fn)) {
        if (search.receiver !== null) continue
        for (const ref of identifiersNamed(tree, search.name)) {
          if (inImport(ref)) continue
          const call = ref.parent
          if (call?.type !== "call" || !same(call.childForFieldName("function"), ref)) continue
          // `make()()` — the returned value is called straight away.
          const outer = call.parent
          if (outer?.type === "call" && same(outer.childForFieldName("function"), call)) {
            const site = enclosing(decls, rangeOf(call))
            if (site !== undefined) addInvocation(site, rangeOf(call), "value")
          }
        }
      }
    }
  }

  /** `ns.name()` — a namespace / module member call is a plain direct call. */
  async function namespaceCalls(file: string, name: string, receiver: string): Promise<void> {
    const tree = await resolver.treeOf(file)
    if (tree === null) return
    const decls = await resolver.declarationsOf(file)
    for (const site of await resolver.callSitesOf(file, name)) {
      if (site.receiver !== receiver) continue
      const at = enclosing(decls, site.at)
      if (at !== undefined) addInvocation(at, site.at, "call")
    }
  }

  /** Seed from the target's own decorators: a route/registration decorator invokes it as a value. */
  async function seedDecorators(): Promise<void> {
    const tree = await resolver.treeOf(target.file)
    if (tree === null) return
    const decls = await resolver.declarationsOf(target.file)
    const decorated = findDecorators(tree.rootNode, target)
    for (const decorator of decorated) {
      const head = decoratorHead(decorator.namedChildren.find((c): c is Node => c !== null) ?? null)
      const at = rangeOf(decorator)
      if (ROUTE_DECORATORS.has(head)) registerSink(decls, at, at)
      else if (head !== "" && !TRANSPARENT_DECORATORS.has(head)) addEscape("decorator", at, target.file)
    }
  }

  // Seed from every candidate: each local name that means the target is a value binding.
  for (const file of await candidates(target)) {
    for (const search of await resolver.localNamesFor(file, target)) {
      if (search.receiver === null) queueBinding(file, search.name, false)
      else await namespaceCalls(file, search.name, search.receiver)
    }
  }
  await seedDecorators()

  while (work.length > 0) await (work.shift() as () => Promise<void>)()

  invocations.sort((a, b) => `${a.code.file}:${a.code.name}`.localeCompare(`${b.code.file}:${b.code.name}`))
  escapes.sort((a, b) => `${a.file}:${a.reason}`.localeCompare(`${b.file}:${b.reason}`))
  return { invocations, escapes }
}

/** The name a single parameter node binds (`x`, `x: int`, `x=1`, `*x`, `**x`). */
function paramName(param: Node): string | null {
  if (param.type === "identifier") return param.text
  const named = param.childForFieldName("name")
  if (named?.type === "identifier") return named.text
  const id = param.namedChildren.find((c): c is Node => c !== null && c.type === "identifier")
  return id?.text ?? null
}

/** The `parameters` of a named `def name(...)`. */
function findParams(root: Node, name: string): Node | null {
  let found: Node | null = null
  const visit = (node: Node): void => {
    if (found !== null) return
    if (node.type === "function_definition" && node.childForFieldName("name")?.text === name) {
      found = node.childForFieldName("parameters")
      return
    }
    for (const child of node.namedChildren) if (child !== null) visit(child)
  }
  visit(root)
  return found
}

/** Every `decorator` node on the declaration of the target (matched by its name line). */
function findDecorators(root: Node, target: CodeRef): Node[] {
  const out: Node[] = []
  const visit = (node: Node): void => {
    if (node.type === "decorated_definition") {
      const definition = node.childForFieldName("definition")
      const nameNode = definition?.childForFieldName("name")
      if (nameNode !== null && nameNode !== undefined && nameNode.startPosition.row + 1 === target.definedAt.start.line) {
        for (const child of node.namedChildren) if (child?.type === "decorator") out.push(child)
      }
    }
    for (const child of node.namedChildren) if (child !== null) visit(child)
  }
  visit(root)
  return out
}
