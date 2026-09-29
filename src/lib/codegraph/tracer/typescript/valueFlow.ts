/**
 * The forward value-flow pass: where does the changed function get invoked when
 * it is handed around as a *value* rather than called by name?
 *
 * The call graph ({@link ./callGraph}) answers "who writes `name(...)`". That
 * misses every indirection where the function travels as a value first — through
 * a hook, a JSX prop, a collection, a return — before it is finally called. This
 * pass follows the *value* forward from the change to every terminal call or
 * sink, and marks every point where the value escapes static resolution.
 *
 * It is deliberately conservative in one direction: **follow the function, never
 * data, and never miss silently.** A binding that turns out to be data (a hook's
 * `state`) simply reaches no call and is pruned; a binding whose value crosses a
 * boundary the trace cannot follow (a spread, a store, a computed dispatch)
 * emits an escape marker rather than stopping quietly.
 *
 * What the pass follows is a *variable*, as the scope manager resolves it
 * ({@link Parsed.scopes}), not a name: a parameter or a local that shares the
 * target's name is another variable and is not followed. A callee, a component
 * or a prop is found the same way, through the variable its name means.
 *
 * Resolution — proving a local name means the target, following barrels — is not
 * re-implemented here: it is the shared {@link Resolver} the call graph also uses.
 */
import type { CallCandidates } from "../language"
import type { CodeRef, EscapeKind, Range } from "../../types"
import type { Resolver } from "./callGraph"
import { calleeOf } from "./callSites"
import { literal } from "./bindings"
import { rangeOf, textOf, type Definition, type Node, type Parsed, type Variable } from "./estree"

/** One place the changed function is ultimately invoked. */
export type Invocation = {
  /** The declaration the invocation sits inside — the node adjacent to the change. */
  code: CodeRef
  /** Where the invocation is written, in that declaration's file. */
  calledAt: Range
  /** `call` for a plain `name()`; `value` for a handoff (hook / prop / collection / return). */
  via: "call" | "value"
}

/** One boundary where the value left static reach. */
export type Escape = { reason: EscapeKind; at: Range; file: string }

export type ValueFlow = { invocations: Invocation[]; escapes: Escape[] }

/** Member-call methods treated as a framework invocation sink (route registration). */
const ROUTE_METHODS = new Set(["get", "post", "put", "delete", "patch", "options", "head", "all", "use"])
/** Member-call methods treated as putting a value into a store / context. */
const STORE_METHODS = new Set(["set", "dispatch", "setState", "put", "write", "provide"])
/** Member-call methods treated as an event-bus registration / publication. */
const BUS_METHODS = new Set(["on", "off", "once", "emit", "subscribe", "publish", "addEventListener"])

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

/** A JSX element name is a component when it is capitalised; lowercase is a host/DOM tag. */
const isComponent = (name: string): boolean => /^[A-Z]/.test(name)

/** Whether `node` is the callee of `call` (a call or a tagged template). */
const isCalleeOf = (call: Node | null, node: Node): boolean => call !== null && calleeOf(call) === node

/** The declarator a node is the `init` of, if any (`const x = <node>`), through an optional chain. */
const declaratorFor = (parsed: Parsed, node: Node): Node | null => {
  const parent = parsed.parentOf(node)
  if (parent?.type !== "VariableDeclarator") return null
  const init = parent.init as Node | null
  return (init?.type === "ChainExpression" ? init.expression : init) === node ? parent : null
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

  const addInvocation = (code: CodeRef, calledAt: Range, via: "call" | "value"): void => {
    // A declaration is never its own invoker (a recursive reference to the change).
    if (code.file === target.file && code.definedAt.start.line === target.definedAt.start.line) return
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

  /**
   * The function a name node means — a callee, a component — with the file it
   * is declared in, or null when it is not a function of the repository.
   *
   * An import is followed to the name it imports in the file it resolves to;
   * a barrel in between is not followed (as before).
   */
  const functionOf = async (
    file: string,
    parsed: Parsed,
    name: Node,
  ): Promise<{ file: string; parsed: Parsed; fn: Node } | null> => {
    const variable = parsed.scopes().variableOf(name)
    const definition = variable === null ? null : parsed.scopes().definitionOf(variable)
    if (definition === null) return null
    if (definition.type !== "ImportBinding") {
      const fn = functionNode(definition)
      return fn === null ? null : { file, parsed, fn }
    }
    const specifier = literal(parsed, definition.parent?.source as Node | undefined)
    const to = specifier === null ? null : await resolver.resolve(file, specifier)
    const there = to === null ? null : await resolver.parsedOf(to)
    if (to === null || there === null) return null
    const part = definition.node
    const imported =
      part.type === "ImportSpecifier" ? textOf(parsed, part.imported as Node) : part.type === "ImportDefaultSpecifier" ? defaultLocal(there) : null
    const exported = imported === null ? null : there.scopes().moduleVariable(imported)
    const theirs = exported === null ? null : there.scopes().definitionOf(exported)
    const fn = theirs === null ? null : functionNode(theirs)
    return fn === null ? null : { file: to, parsed: there, fn }
  }

  const seen = new Set<string>()
  const work: (() => Promise<void>)[] = []
  // A variable is known by where its name is declared.
  const keyOf = (variable: Variable): string => String(variable.identifiers[0]?.range[0] ?? variable.name)
  const queueBinding = (file: string, variable: Variable | null, handoff: boolean): void => {
    if (variable === null) return
    const key = `b:${file}:${keyOf(variable)}:${String(handoff)}`
    if (seen.has(key)) return
    seen.add(key)
    work.push(() => analyzeBinding(file, variable, handoff))
  }
  const queueCollection = (file: string, variable: Variable | null): void => {
    if (variable === null) return
    const key = `c:${file}:${keyOf(variable)}`
    if (seen.has(key)) return
    seen.add(key)
    work.push(() => analyzeCollection(file, variable))
  }
  const queueReturns = (fn: CodeRef): void => {
    const key = `r:${fn.file}:${String(fn.definedAt.start.line)}`
    if (seen.has(key)) return
    seen.add(key)
    work.push(() => analyzeReturns(fn))
  }

  const queueMember = (file: string, variable: Variable | null, key: string): void => {
    if (variable === null) return
    const id = `m:${file}:${keyOf(variable)}:${key}`
    if (seen.has(id)) return
    seen.add(id)
    work.push(() => analyzeMember(file, variable, key))
  }

  /** A binding that holds the value: follow every use forward. */
  async function analyzeBinding(file: string, variable: Variable, handoff: boolean): Promise<void> {
    const parsed = await resolver.parsedOf(file)
    if (parsed === null) return
    const decls = await resolver.declarationsOf(file)
    for (const ref of parsed.scopes().valueReads(variable)) await analyzeUse(parsed, file, decls, ref, handoff)
  }

  /**
   * One expression that holds the value — a name, a bound copy, a prop read off
   * `props` — and what its parent does with it.
   */
  async function analyzeUse(parsed: Parsed, file: string, decls: readonly CodeRef[], ref: Node, handoff: boolean): Promise<void> {
    const parent = parsed.parentOf(ref)
    if (parent === null) return

    // `name(...)` — a terminal call.
    if (isCalleeOf(parent, ref)) {
      const at = enclosing(decls, rangeOf(parsed, ref))
      if (at !== undefined) addInvocation(at, rangeOf(parsed, ref), handoff ? "value" : "call")
      return
    }

    // `<Name …>` — a rendered component. React calls it, so JSX is a call, as
    // the caller climb already counts it (`callSitesIn`).
    if (parent.type === "JSXOpeningElement" && parent.name === ref) {
      const at = enclosing(decls, rangeOf(parsed, ref))
      if (at !== undefined) addInvocation(at, rangeOf(parsed, ref), handoff ? "value" : "call")
      return
    }

    // `name.bind(…)` — a bound copy runs the same function, so it carries the value.
    if (parent.type === "MemberExpression" && parent.object === ref && parent.computed !== true && textOf(parsed, parent.property as Node) === "bind") {
      const call = parsed.parentOf(parent)
      if (call !== null && isCalleeOf(call, parent)) await analyzeUse(parsed, file, decls, call, handoff)
      return
    }

    // `const alias = name` — a plain copy; the alias carries the same value.
    if (parent.type === "VariableDeclarator" && parent.init === ref) {
      for (const b of parsed.scopes().declared(parent)) queueBinding(file, b, handoff)
      return
    }

    // `return name` — the value leaves as the enclosing function's result.
    if (parent.type === "ReturnStatement") {
      const fn = enclosing(decls, rangeOf(parsed, ref))
      if (fn !== undefined) queueReturns(fn)
      return
    }

    // `f(name)` — the value passed as a call argument.
    if (parent.type === "CallExpression" && (parent.arguments as Node[]).includes(ref)) {
      await handleArg(parsed, file, decls, ref, parent)
      return
    }

    // `[name]` / `{ k: name }` — inserted into a collection literal.
    if (parent.type === "ArrayExpression") {
      const declarator = declaratorFor(parsed, parent)
      if (declarator !== null && (declarator.id as Node).type === "Identifier") queueCollection(file, parsed.scopes().declared(declarator)[0] ?? null)
      return
    }
    if (parent.type === "Property" && parent.value === ref && parsed.parentOf(parent)?.type === "ObjectExpression") {
      const object = parsed.parentOf(parent) as Node
      const declarator = declaratorFor(parsed, object)
      if (declarator !== null && (declarator.id as Node).type === "Identifier") queueCollection(file, parsed.scopes().declared(declarator)[0] ?? null)
      return
    }

    // A JSX prop / spread / DOM sink.
    if (/^(JSXExpressionContainer|SpreadElement|JSXSpreadAttribute|JSXSpreadChild)$/.test(parent.type)) {
      await handleJsx(parsed, file, decls, ref, parent)
    }
    // Any other use (member receiver, arithmetic, render as text) is data — ignore.
  }

  /**
   * A `props` object that holds the value under `key`: `props.key` carries it,
   * and so does `const { key } = props`, renamed or not. A spread loses it.
   */
  async function analyzeMember(file: string, variable: Variable, key: string): Promise<void> {
    const parsed = await resolver.parsedOf(file)
    if (parsed === null) return
    const decls = await resolver.declarationsOf(file)
    for (const ref of parsed.scopes().valueReads(variable)) {
      const parent = parsed.parentOf(ref)
      if (parent === null) continue
      if (parent.type === "MemberExpression" && parent.object === ref && parent.computed !== true) {
        if (textOf(parsed, parent.property as Node) === key) await analyzeUse(parsed, file, decls, parent, true)
        continue
      }
      if (parent.type === "VariableDeclarator" && parent.init === ref && (parent.id as Node).type === "ObjectPattern") {
        followPattern(parsed, file, parent.id as Node, key)
        continue
      }
      if (/^(SpreadElement|JSXSpreadAttribute|JSXSpreadChild)$/.test(parent.type)) addEscape("spread", rangeOf(parsed, ref), file)
    }
  }

  /** `{ key }`, `{ key: other }` or `{ ...rest }` taking `key` out of an object that holds the value. */
  function followPattern(parsed: Parsed, file: string, pattern: Node, key: string): void {
    for (const property of pattern.properties as Node[]) {
      if (property.type === "RestElement") {
        const rest = property.argument as Node
        if (rest.type === "Identifier") queueMember(file, parsed.scopes().variableOf(rest), key)
        continue
      }
      if (property.type !== "Property" || property.computed === true) continue
      const name = property.key as Node
      if ((name.type === "Identifier" ? name.name : name.value) !== key) continue
      let value = property.value as Node
      if (value.type === "AssignmentPattern") value = value.left as Node
      if (value.type === "Identifier") queueBinding(file, parsed.scopes().variableOf(value), true)
      return
    }
  }

  /** The value passed as an argument of a call — a hook, a descend, a sink, or an escape. */
  async function handleArg(
    parsed: Parsed,
    file: string,
    decls: readonly CodeRef[],
    ref: Node,
    call: Node,
  ): Promise<void> {
    const callee = call.callee as Node
    const at = rangeOf(parsed, ref)

    // A member call: a recognised framework sink, or a boundary we cannot cross.
    if (callee.type === "MemberExpression" && callee.computed !== true) {
      const prop = textOf(parsed, callee.property as Node)
      if (ROUTE_METHODS.has(prop)) {
        const site = enclosing(decls, rangeOf(parsed, call))
        if (site !== undefined) addInvocation(site, at, "value")
      } else if (STORE_METHODS.has(prop)) addEscape("store", at, file)
      else if (BUS_METHODS.has(prop)) addEscape("event-bus", at, file)
      else addEscape("library", at, file)
      return
    }
    if (callee.type !== "Identifier") return

    const index = (call.arguments as Node[]).indexOf(ref)
    const declarator = declaratorFor(parsed, call)
    const results = declarator ? parsed.scopes().declared(declarator) : []
    const to = await functionOf(file, parsed, callee)

    if (to === null) {
      // An un-indexed callee: an HOC (its result is a component) or a library.
      const hoc = results.some((one) => isComponent(one.name))
      addEscape(hoc ? "hoc" : "library", at, file)
      return
    }

    if (results.length > 0) {
      // The value went in and a wrapper came back (a hook): follow every result
      // binding. Data bindings reach no call and drop out; the callback does not.
      for (const one of results) queueBinding(file, one, true)
      return
    }
    // The value becomes the callee's parameter: descend into it.
    queueBinding(to.file, parameterAt(to.parsed, to.fn, index), true)
  }

  /** The value used inside JSX: a DOM sink, a prop into a child, or a spread escape. */
  async function handleJsx(parsed: Parsed, file: string, decls: readonly CodeRef[], ref: Node, parent: Node): Promise<void> {
    // `<El {...obj}>` — the prop name is not statically known.
    if (parent.type !== "JSXExpressionContainer") {
      addEscape("spread", rangeOf(parsed, ref), file)
      return
    }
    const attribute = parsed.parentOf(parent)
    if (attribute?.type !== "JSXAttribute") return
    const element = parsed.parentOf(attribute)
    if (element === null) return
    const tag = element.name as Node
    const elementName = tag.type === "JSXIdentifier" ? (tag.name as string) : ""
    if (elementName === "") return

    if (!isComponent(elementName)) {
      // A DOM/host element: the handler is wired to a framework sink and fires here.
      const site = enclosing(decls, rangeOf(parsed, element))
      if (site !== undefined) addInvocation(site, rangeOf(parsed, ref), "value")
      return
    }
    // A component prop: follow the value into the child's parameter of that name.
    const prop = attribute.name as Node
    const propName = prop.type === "JSXIdentifier" ? (prop.name as string) : undefined
    const to = await functionOf(file, parsed, tag)
    if (to === null) {
      addEscape("library", rangeOf(parsed, ref), file)
      return
    }
    if (propName !== undefined) followProp(to, propName, rangeOf(parsed, ref), file)
  }

  /**
   * The value handed to a component as prop `key`: into the parameter the
   * component takes its props with. A component that takes none does not read
   * it; props the trace cannot take apart escape.
   */
  function followProp(to: { file: string; parsed: Parsed; fn: Node }, key: string, at: Range, from: string): void {
    let first = (to.fn.params as Node[])[0]
    if (first?.type === "AssignmentPattern") first = first.left as Node
    if (first === undefined) return
    if (first.type === "ObjectPattern") followPattern(to.parsed, to.file, first, key)
    else if (first.type === "Identifier") queueMember(to.file, to.parsed.scopes().variableOf(first), key)
    else addEscape("props", at, from)
  }

  /** A collection that holds the value: a static index-call reaches it; a computed one escapes. */
  async function analyzeCollection(file: string, variable: Variable): Promise<void> {
    const parsed = await resolver.parsedOf(file)
    if (parsed === null) return
    const decls = await resolver.declarationsOf(file)
    for (const ref of parsed.scopes().valueReads(variable)) {
      const parent = parsed.parentOf(ref)
      if (parent === null) continue

      // `coll[...]` — a subscript, static (a call we can attribute) or computed (an escape).
      if (parent.type === "MemberExpression" && parent.computed === true && parent.object === ref) {
        const call = parsed.parentOf(parent)
        if (call?.type !== "CallExpression" || call.callee !== parent) continue
        const key = parent.property as Node
        const at = rangeOf(parsed, parent)
        const literalKey = key.type === "Literal" && (typeof key.value === "number" || typeof key.value === "string" || typeof key.bigint === "string")
        if (literalKey) {
          const site = enclosing(decls, at)
          if (site !== undefined) addInvocation(site, at, "value")
        } else {
          addEscape("dynamic-dispatch", at, file)
        }
        continue
      }
      // `coll.name()` — a static member call reaches it.
      if (parent.type === "MemberExpression" && parent.object === ref) {
        const call = parsed.parentOf(parent)
        if (call?.type === "CallExpression" && call.callee === parent) {
          const at = rangeOf(parsed, parent)
          const site = enclosing(decls, at)
          if (site !== undefined) addInvocation(site, at, "value")
        }
        continue
      }
      // `<El {...coll}>` — the collection is spread; the value is lost.
      if (/^(SpreadElement|JSXSpreadAttribute|JSXSpreadChild)$/.test(parent.type)) addEscape("spread", rangeOf(parsed, ref), file)
    }
  }

  /** A function that returns the value: a caller that immediately calls its result reaches it. */
  async function analyzeReturns(fn: CodeRef): Promise<void> {
    for (const file of await candidates(fn)) {
      const parsed = await resolver.parsedOf(file)
      if (parsed === null) continue
      const decls = await resolver.declarationsOf(file)
      for (const search of await resolver.localNamesFor(file, fn)) {
        const variable = search.receiver === null ? parsed.scopes().moduleVariable(search.name) : null
        if (variable === null) continue
        for (const ref of parsed.scopes().valueReads(variable)) {
          const call = parsed.parentOf(ref)
          if (call === null || !isCalleeOf(call, ref)) continue
          // `make()()` — the returned value is called straight away.
          if (isCalleeOf(parsed.parentOf(call), call)) {
            const site = enclosing(decls, rangeOf(parsed, call))
            if (site !== undefined) addInvocation(site, rangeOf(parsed, call), "value")
          }
        }
      }
    }
  }

  // Seed from every candidate: each local name that means the target is a
  // module-scope binding (an import, or the target's own name in its file).
  for (const file of await candidates(target)) {
    const parsed = await resolver.parsedOf(file)
    for (const search of await resolver.localNamesFor(file, target)) {
      if (search.receiver === null) queueBinding(file, parsed?.scopes().moduleVariable(search.name) ?? null, false)
      else await namespaceCalls(file, search.name, search.receiver)
    }
  }
  // And from the variable the target declares, where it is declared: the only
  // name a local function (`BasketForm.onSubmit`) is read by. For a module-scope
  // one it is the binding already queued above.
  const home = await resolver.parsedOf(target.file)
  if (home !== null) queueBinding(target.file, declaredAt(home, target.definedAt), false)

  /** `ns.name()` — a namespace member call is a plain direct call. */
  async function namespaceCalls(file: string, name: string, receiver: string): Promise<void> {
    const parsed = await resolver.parsedOf(file)
    if (parsed === null) return
    const decls = await resolver.declarationsOf(file)
    for (const site of await resolver.callSitesOf(file, name)) {
      if (site.receiver !== receiver) continue
      const at = enclosing(decls, site.at)
      if (at !== undefined) addInvocation(at, site.at, "call")
    }
  }

  while (work.length > 0) await (work.shift() as () => Promise<void>)()

  invocations.sort((a, b) => `${a.code.file}:${a.code.name}`.localeCompare(`${b.code.file}:${b.code.name}`))
  escapes.sort((a, b) => `${a.file}:${a.reason}`.localeCompare(`${b.file}:${b.reason}`))
  return { invocations, escapes }
}

/** The variable a name declares, found by where the name is written; null for none. */
function declaredAt(parsed: Parsed, at: Range): Variable | null {
  for (const node of parsed.nodes) {
    if (node.type !== "Identifier") continue
    const start = parsed.positionAt(node.start)
    if (start.line === at.start.line && start.column === at.start.column) return parsed.scopes().variableOf(node)
  }
  return null
}

/** The function a definition declares: a function declaration, or a declarator whose value is a function. */
function functionNode(definition: Definition): Node | null {
  if (definition.type === "FunctionName") return definition.node
  if (definition.type !== "Variable") return null
  const init = definition.node.init as Node | null
  if (init?.type === "ArrowFunctionExpression" || (init?.type === "FunctionExpression" && init.generator !== true)) return init
  return null
}

/** The local name of a file's default export, or null. */
function defaultLocal(parsed: Parsed): string | null {
  for (const statement of parsed.program.body as Node[]) {
    if (statement.type !== "ExportDefaultDeclaration") continue
    const target = statement.declaration as Node
    return target.type === "Identifier" ? (target.name as string) : (((target.id as Node | null | undefined)?.name as string | undefined) ?? null)
  }
  return null
}

/**
 * The variable a function's parameter at an index binds the value to: a name,
 * a name with a default, or a parameter property. A rest parameter holds an
 * array of the arguments, and a pattern takes the value apart: neither holds
 * the value itself.
 */
function parameterAt(parsed: Parsed, fn: Node, index: number): Variable | null {
  let param = (fn.params as Node[])[index]
  if (param?.type === "TSParameterProperty") param = param.parameter as Node
  if (param?.type === "AssignmentPattern") param = param.left as Node
  return param?.type === "Identifier" ? parsed.scopes().variableOf(param) : null
}
