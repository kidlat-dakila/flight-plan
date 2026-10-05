import type { CallCandidates } from "@/core/tracer/language"
import type { CodeRef, EscapeKind, Pos, Range } from "@/core/types"
import { literal } from "./bindings"
import type { Resolver } from "./call-graph"
import { calleeOf } from "./call-sites"
import { rangeOf, textOf, type Definition, type Parsed, type Variable } from "./estree"
import { childAt, childrenAt, textAt, type Node } from "./node"

export interface Invocation {
  code: CodeRef
  calledAt: Range
  via: "call" | "value"
}

export interface Escape { reason: EscapeKind, at: Range, file: string }

export interface ValueFlow { invocations: Invocation[], escapes: Escape[] }

type Task
  = | { kind: "binding", file: string, variable: Variable, isHandoff: boolean }
    | { kind: "collection", file: string, variable: Variable }
    | { kind: "returns", fn: CodeRef }
    | { kind: "member", file: string, variable: Variable, key: string }

type Finding
  = | { kind: "invocation", invocation: Invocation }
    | { kind: "escape", escape: Escape }
    | { kind: "task", task: Task }

interface Located { file: string, parsed: Parsed, fn: Node }

interface Use { parsed: Parsed, file: string, decls: readonly CodeRef[] }

interface Trace {
  queue: readonly Task[]
  queued: ReadonlySet<string>
  invocations: readonly Invocation[]
  invoked: ReadonlySet<string>
  escapes: readonly Escape[]
  escaped: ReadonlySet<string>
}

const ROUTE_METHODS = new Set(["get", "post", "put", "delete", "patch", "options", "head", "all", "use"])
const STORE_METHODS = new Set(["set", "dispatch", "setState", "put", "write", "provide"])
const BUS_METHODS = new Set(["on", "off", "once", "emit", "subscribe", "publish", "addEventListener"])
const SPREAD = /^(SpreadElement|JSXSpreadAttribute|JSXSpreadChild)$/
const SPREAD_OR_CONTAINER = /^(JSXExpressionContainer|SpreadElement|JSXSpreadAttribute|JSXSpreadChild)$/
const LINE_WEIGHT = 1e6

const area = (r: Range): number => (r.end.line - r.start.line) * LINE_WEIGHT + (r.end.column - r.start.column)
const atOrAfter = (a: Pos, b: Pos): boolean => a.line > b.line || (a.line === b.line && a.column >= b.column)
const contains = (outer: Range, at: Range): boolean => atOrAfter(at.start, outer.start) && atOrAfter(outer.end, at.start)

const enclosing = (decls: readonly CodeRef[], at: Range): CodeRef | undefined =>
  decls
    .filter((decl) => contains(decl.enclosingRange, at))
    .reduce<CodeRef | undefined>(
      (best, decl) => (best === undefined || area(decl.enclosingRange) < area(best.enclosingRange) ? decl : best),
      undefined,
    )

const isComponent = (name: string): boolean => /^[A-Z]/.test(name)

const isCalleeOf = (call: Node | null, node: Node): boolean => call !== null && calleeOf(call) === node

const declaratorFor = (parsed: Parsed, node: Node): Node | null => {
  const parent = parsed.parentOf(node)
  if (parent?.type !== "VariableDeclarator") return null
  const init = childAt(parent, "init")
  return (init?.type === "ChainExpression" ? init.expression : init) === node ? parent : null
}

const firstDeclared = (parsed: Parsed, declarator: Node): Variable | null => {
  const declared = parsed.scopes().declared(declarator)
  return declared.length === 0 ? null : declared[0]
}

const variableKey = (variable: Variable): string =>
  variable.identifiers.length > 0 ? String(variable.identifiers[0].range[0]) : variable.name

const taskKey = (task: Task): string => {
  if (task.kind === "binding") return `b:${task.file}:${variableKey(task.variable)}:${String(task.isHandoff)}`
  if (task.kind === "collection") return `c:${task.file}:${variableKey(task.variable)}`
  if (task.kind === "returns") return `r:${task.fn.file}:${String(task.fn.definedAt.start.line)}`
  return `m:${task.file}:${variableKey(task.variable)}:${task.key}`
}

const invoked = (code: CodeRef | undefined, calledAt: Range, via: Invocation["via"]): Finding[] =>
  code === undefined ? [] : [{ kind: "invocation", invocation: { code, calledAt, via } }]

const escapedAt = (reason: EscapeKind, at: Range, file: string): Finding[] => [{ kind: "escape", escape: { reason, at, file } }]

const bindingOf = (file: string, variable: Variable | null, isHandoff: boolean): Finding[] =>
  variable === null ? [] : [{ kind: "task", task: { kind: "binding", file, variable, isHandoff } }]

const collectionOf = (file: string, variable: Variable | null): Finding[] =>
  variable === null ? [] : [{ kind: "task", task: { kind: "collection", file, variable } }]

const memberOf = (file: string, variable: Variable | null, key: string): Finding[] =>
  variable === null ? [] : [{ kind: "task", task: { kind: "member", file, variable, key } }]

const returnsOf = (fn: CodeRef | undefined): Finding[] => (fn === undefined ? [] : [{ kind: "task", task: { kind: "returns", fn } }])

const invocationKey = ({ code, via }: Invocation): string => `${code.file}:${String(code.definedAt.start.line)}:${via}`

const escapeKey = ({ reason, at, file }: Escape): string => `${file}:${String(at.start.line)}:${String(at.start.column)}:${reason}`

const isTarget = (code: CodeRef, target: CodeRef): boolean =>
  code.file === target.file && code.definedAt.start.line === target.definedAt.start.line

const withInvocation = (trace: Trace, invocation: Invocation, target: CodeRef): Trace => {
  const key = invocationKey(invocation)
  if (isTarget(invocation.code, target) || trace.invoked.has(key)) return trace
  return { ...trace, invocations: [...trace.invocations, invocation], invoked: new Set(trace.invoked).add(key) }
}

const withEscape = (trace: Trace, escape: Escape): Trace => {
  const key = escapeKey(escape)
  return trace.escaped.has(key) ? trace : { ...trace, escapes: [...trace.escapes, escape], escaped: new Set(trace.escaped).add(key) }
}

const withTask = (trace: Trace, task: Task): Trace => {
  const key = taskKey(task)
  return trace.queued.has(key) ? trace : { ...trace, queue: [...trace.queue, task], queued: new Set(trace.queued).add(key) }
}

const absorbed = (target: CodeRef) => (trace: Trace, finding: Finding): Trace => {
  if (finding.kind === "invocation") return withInvocation(trace, finding.invocation, target)
  return finding.kind === "escape" ? withEscape(trace, finding.escape) : withTask(trace, finding.task)
}

const NOTHING_TRACED: Trace = { queue: [], queued: new Set(), invocations: [], invoked: new Set(), escapes: [], escaped: new Set() }

const propertyKeyOf = (property: Node): unknown => {
  const name = childAt(property, "key")
  if (name === null) return null
  return name.type === "Identifier" ? name.name : name.value
}

const isPropertyNamed = (property: Node, key: string): boolean =>
  property.type === "Property" && property.computed !== true && propertyKeyOf(property) === key

function patternBindingOf(parsed: Parsed, file: string, property: Node): Finding[] {
  const held = childAt(property, "value")
  const value = held?.type === "AssignmentPattern" ? childAt(held, "left") : held
  return value?.type === "Identifier" ? bindingOf(file, parsed.scopes().variableOf(value), true) : []
}

function restMemberOf(parsed: Parsed, file: string, property: Node, key: string): Finding[] {
  const rest = childAt(property, "argument")
  return rest?.type === "Identifier" ? memberOf(file, parsed.scopes().variableOf(rest), key) : []
}

function followPattern(parsed: Parsed, file: string, pattern: Node, key: string): Finding[] {
  const properties = childrenAt(pattern, "properties")
  const named = properties.findIndex((property) => isPropertyNamed(property, key))
  const considered = named === -1 ? properties : properties.slice(0, named + 1)
  return considered.flatMap((property, index) => {
    if (property.type === "RestElement") return restMemberOf(parsed, file, property, key)
    return index === named ? patternBindingOf(parsed, file, property) : []
  })
}

function followProp(to: Located, key: string, at: Range, from: string): Finding[] {
  const params = childrenAt(to.fn, "params")
  if (params.length === 0) return []
  const first = params[0].type === "AssignmentPattern" ? childAt(params[0], "left") : params[0]
  if (first === null) return []
  if (first.type === "ObjectPattern") return followPattern(to.parsed, to.file, first, key)
  return first.type === "Identifier" ? memberOf(to.file, to.parsed.scopes().variableOf(first), key) : escapedAt("props", at, from)
}

function isLiteralKey(key: Node | null): boolean {
  return key?.type === "Literal" && (typeof key.value === "number" || typeof key.value === "string" || typeof key.bigint === "string")
}

function collectionUse({ parsed, file, decls }: Use, ref: Node): Finding[] {
  const parent = parsed.parentOf(ref)
  if (parent === null) return []
  if (parent.type !== "MemberExpression" || parent.object !== ref) return SPREAD.test(parent.type) ? escapedAt("spread", rangeOf(parsed, ref), file) : []
  const call = parsed.parentOf(parent)
  if (call?.type !== "CallExpression" || call.callee !== parent) return []
  const at = rangeOf(parsed, parent)
  const isResolvable = parent.computed !== true || isLiteralKey(childAt(parent, "property"))
  return isResolvable ? invoked(enclosing(decls, at), at, "value") : escapedAt("dynamic-dispatch", at, file)
}

function returnedCallsOf({ parsed, decls }: Use, variable: Variable): Finding[] {
  return parsed.scopes().valueReads(variable).flatMap((ref) => {
    const call = parsed.parentOf(ref)
    if (call === null || !isCalleeOf(call, ref) || !isCalleeOf(parsed.parentOf(call), call)) return []
    return invoked(enclosing(decls, rangeOf(parsed, call)), rangeOf(parsed, call), "value")
  })
}

function declaredAt(parsed: Parsed, at: Range): Variable | null {
  const named = parsed.nodes.find((node) => {
    if (node.type !== "Identifier") return false
    const start = parsed.positionAt(node.start)
    return start.line === at.start.line && start.column === at.start.column
  })
  return named === undefined ? null : parsed.scopes().variableOf(named)
}

function functionNode(definition: Definition): Node | null {
  if (definition.type === "FunctionName") return definition.node
  if (definition.type !== "Variable") return null
  const init = childAt(definition.node, "init")
  if (init?.type === "ArrowFunctionExpression" || (init?.type === "FunctionExpression" && init.generator !== true)) return init
  return null
}

function defaultLocal(parsed: Parsed): string | null {
  const statement = childrenAt(parsed.program, "body").find((one) => one.type === "ExportDefaultDeclaration")
  const target = statement === undefined ? null : childAt(statement, "declaration")
  const named = target?.type === "Identifier" ? target : target && childAt(target, "id")
  return named === null ? null : textAt(named, "name")
}

function importedNameOf(parsed: Parsed, there: Parsed, part: Node): string | null {
  const imported = part.type === "ImportSpecifier" ? childAt(part, "imported") : null
  if (imported !== null) return textOf(parsed, imported)
  return part.type === "ImportDefaultSpecifier" ? defaultLocal(there) : null
}

function parameterAt(parsed: Parsed, fn: Node, index: number): Variable | null {
  const params = childrenAt(fn, "params")
  if (index < 0 || index >= params.length) return null
  const owned = params[index].type === "TSParameterProperty" ? childAt(params[index], "parameter") : params[index]
  const param = owned?.type === "AssignmentPattern" ? childAt(owned, "left") : owned
  return param?.type === "Identifier" ? parsed.scopes().variableOf(param) : null
}

function flowAnalysis(resolver: Resolver, candidates: CallCandidates): { findingsOf: (task: Task) => Promise<Finding[]>, startOf: (target: CodeRef) => Promise<Finding[]> } {
  const useOf = async (file: string): Promise<Use | null> => {
    const parsed = await resolver.parsedOf(file)
    return parsed === null ? null : { parsed, file, decls: await resolver.declarationsOf(file) }
  }

  const importedFunctionOf = async (file: string, parsed: Parsed, definition: Definition): Promise<Located | null> => {
    const specifier = literal(parsed, definition.parent === null ? null : childAt(definition.parent, "source"))
    const to = specifier === null ? null : await resolver.resolve(file, specifier)
    const there = to === null ? null : await resolver.parsedOf(to)
    if (to === null || there === null) return null
    const imported = importedNameOf(parsed, there, definition.node)
    const exported = imported === null ? null : there.scopes().moduleVariable(imported)
    const theirs = exported === null ? null : there.scopes().definitionOf(exported)
    const fn = theirs === null ? null : functionNode(theirs)
    return fn === null ? null : { file: to, parsed: there, fn }
  }

  const functionOf = async (file: string, parsed: Parsed, name: Node): Promise<Located | null> => {
    const variable = parsed.scopes().variableOf(name)
    const definition = variable === null ? null : parsed.scopes().definitionOf(variable)
    if (definition === null) return null
    if (definition.type === "ImportBinding") return importedFunctionOf(file, parsed, definition)
    const fn = functionNode(definition)
    return fn === null ? null : { file, parsed, fn }
  }

  const handedToMethod = ({ parsed, file, decls }: Use, ref: Node, call: Node, property: Node): Finding[] => {
    const at = rangeOf(parsed, ref)
    const method = textOf(parsed, property)
    if (ROUTE_METHODS.has(method)) return invoked(enclosing(decls, rangeOf(parsed, call)), at, "value")
    if (STORE_METHODS.has(method)) return escapedAt("store", at, file)
    return escapedAt(BUS_METHODS.has(method) ? "event-bus" : "library", at, file)
  }

  const handedToFunction = async ({ parsed, file }: Use, ref: Node, call: Node, callee: Node): Promise<Finding[]> => {
    const index = childrenAt(call, "arguments").indexOf(ref)
    const declarator = declaratorFor(parsed, call)
    const results = declarator === null ? [] : parsed.scopes().declared(declarator)
    const to = await functionOf(file, parsed, callee)
    if (to === null) return escapedAt(results.some((one) => isComponent(one.name)) ? "hoc" : "library", rangeOf(parsed, ref), file)
    if (results.length > 0) return results.flatMap((one) => bindingOf(file, one, true))
    return bindingOf(to.file, parameterAt(to.parsed, to.fn, index), true)
  }

  const handleArg = async (use: Use, ref: Node, call: Node): Promise<Finding[]> => {
    const callee = childAt(call, "callee")
    const property = callee === null ? null : childAt(callee, "property")
    if (callee?.type === "MemberExpression" && callee.computed !== true) return property === null ? [] : handedToMethod(use, ref, call, property)
    return callee?.type === "Identifier" ? handedToFunction(use, ref, call, callee) : []
  }

  const handleProp = async ({ parsed, file, decls }: Use, ref: Node, attribute: Node, element: Node): Promise<Finding[]> => {
    const tag = childAt(element, "name")
    const elementName = tag?.type === "JSXIdentifier" ? (textAt(tag, "name") ?? "") : ""
    if (tag === null || elementName === "") return []
    if (!isComponent(elementName)) return invoked(enclosing(decls, rangeOf(parsed, element)), rangeOf(parsed, ref), "value")
    const prop = childAt(attribute, "name")
    const propName = prop?.type === "JSXIdentifier" ? textAt(prop, "name") : null
    const to = await functionOf(file, parsed, tag)
    if (to === null) return escapedAt("library", rangeOf(parsed, ref), file)
    return propName === null ? [] : followProp(to, propName, rangeOf(parsed, ref), file)
  }

  const handleJsx = async (use: Use, ref: Node, parent: Node): Promise<Finding[]> => {
    if (parent.type !== "JSXExpressionContainer") return escapedAt("spread", rangeOf(use.parsed, ref), use.file)
    const attribute = use.parsed.parentOf(parent)
    const element = attribute?.type === "JSXAttribute" ? use.parsed.parentOf(attribute) : null
    return attribute === null || element === null ? [] : handleProp(use, ref, attribute, element)
  }

  const isBound = (parsed: Parsed, parent: Node, ref: Node): boolean => {
    const property = parent.type === "MemberExpression" && parent.object === ref && parent.computed !== true ? childAt(parent, "property") : null
    return property !== null && textOf(parsed, property) === "bind"
  }

  const storedIn = ({ parsed, file }: Use, holder: Node): Finding[] => {
    const declarator = declaratorFor(parsed, holder)
    return declarator !== null && childAt(declarator, "id")?.type === "Identifier" ? collectionOf(file, firstDeclared(parsed, declarator)) : []
  }

  const heldUse = async (use: Use, ref: Node, parent: Node): Promise<Finding[]> => {
    if (parent.type === "CallExpression" && childrenAt(parent, "arguments").includes(ref)) return handleArg(use, ref, parent)
    if (parent.type === "ArrayExpression") return storedIn(use, parent)
    const object = parent.type === "Property" && parent.value === ref ? use.parsed.parentOf(parent) : null
    if (object?.type === "ObjectExpression") return storedIn(use, object)
    return SPREAD_OR_CONTAINER.test(parent.type) ? handleJsx(use, ref, parent) : []
  }

  const analyzeUse = async (use: Use, ref: Node, isHandoff: boolean): Promise<Finding[]> => {
    const { parsed, file, decls } = use
    const parent = parsed.parentOf(ref)
    if (parent === null) return []
    const at = rangeOf(parsed, ref)
    if (isCalleeOf(parent, ref) || (parent.type === "JSXOpeningElement" && parent.name === ref)) {
      return invoked(enclosing(decls, at), at, isHandoff ? "value" : "call")
    }
    if (isBound(parsed, parent, ref)) {
      const call = parsed.parentOf(parent)
      return call !== null && isCalleeOf(call, parent) ? analyzeUse(use, call, isHandoff) : []
    }
    if (parent.type === "VariableDeclarator" && parent.init === ref) {
      return parsed.scopes().declared(parent).flatMap((variable) => bindingOf(file, variable, isHandoff))
    }
    return parent.type === "ReturnStatement" ? returnsOf(enclosing(decls, at)) : heldUse(use, ref, parent)
  }

  const analyzeBinding = async (file: string, variable: Variable, isHandoff: boolean): Promise<Finding[]> => {
    const use = await useOf(file)
    if (use === null) return []
    const found = await Promise.all(use.parsed.scopes().valueReads(variable).map(async (ref) => analyzeUse(use, ref, isHandoff)))
    return found.flat()
  }

  const memberUse = async (use: Use, ref: Node, key: string): Promise<Finding[]> => {
    const { parsed, file } = use
    const parent = parsed.parentOf(ref)
    if (parent === null) return []
    if (parent.type === "MemberExpression" && parent.object === ref && parent.computed !== true) {
      const property = childAt(parent, "property")
      return property !== null && textOf(parsed, property) === key ? analyzeUse(use, parent, true) : []
    }
    const pattern = parent.type === "VariableDeclarator" && parent.init === ref ? childAt(parent, "id") : null
    if (pattern?.type === "ObjectPattern") return followPattern(parsed, file, pattern, key)
    return SPREAD.test(parent.type) ? escapedAt("spread", rangeOf(parsed, ref), file) : []
  }

  const analyzeMember = async (file: string, variable: Variable, key: string): Promise<Finding[]> => {
    const use = await useOf(file)
    if (use === null) return []
    const found = await Promise.all(use.parsed.scopes().valueReads(variable).map(async (ref) => memberUse(use, ref, key)))
    return found.flat()
  }

  const analyzeCollection = async (file: string, variable: Variable): Promise<Finding[]> => {
    const use = await useOf(file)
    return use === null ? [] : use.parsed.scopes().valueReads(variable).flatMap((ref) => collectionUse(use, ref))
  }

  const returnsIn = async (file: string, fn: CodeRef): Promise<Finding[]> => {
    const use = await useOf(file)
    if (use === null) return []
    const searches = await resolver.localNamesFor(file, fn)
    return searches.flatMap((search) => {
      const variable = search.receiver === null ? use.parsed.scopes().moduleVariable(search.name) : null
      return variable === null ? [] : returnedCallsOf(use, variable)
    })
  }

  const analyzeReturns = async (fn: CodeRef): Promise<Finding[]> => {
    const files = await candidates(fn)
    return (await Promise.all(files.map(async (file) => returnsIn(file, fn)))).flat()
  }

  const namespaceCalls = async (file: string, name: string, receiver: string): Promise<Finding[]> => {
    const use = await useOf(file)
    if (use === null) return []
    const sites = await resolver.callSitesOf(file, name)
    return sites.filter((site) => site.receiver === receiver).flatMap((site) => invoked(enclosing(use.decls, site.at), site.at, "call"))
  }

  const usesIn = async (file: string, target: CodeRef): Promise<Finding[]> => {
    const parsed = await resolver.parsedOf(file)
    const searches = await resolver.localNamesFor(file, target)
    const found = await Promise.all(
      searches.map(async (search) =>
        search.receiver === null
          ? bindingOf(file, parsed?.scopes().moduleVariable(search.name) ?? null, false)
          : namespaceCalls(file, search.name, search.receiver),
      ),
    )
    return found.flat()
  }

  const startOf = async (target: CodeRef): Promise<Finding[]> => {
    const files = await candidates(target)
    const used = await Promise.all(files.map(async (file) => usesIn(file, target)))
    const home = await resolver.parsedOf(target.file)
    return [...used.flat(), ...(home === null ? [] : bindingOf(target.file, declaredAt(home, target.definedAt), false))]
  }

  const findingsOf = async (task: Task): Promise<Finding[]> => {
    if (task.kind === "binding") return analyzeBinding(task.file, task.variable, task.isHandoff)
    if (task.kind === "collection") return analyzeCollection(task.file, task.variable)
    return task.kind === "returns" ? analyzeReturns(task.fn) : analyzeMember(task.file, task.variable, task.key)
  }

  return { findingsOf, startOf }
}

export async function traceValueFlow(
  resolver: Resolver,
  candidates: CallCandidates,
  target: CodeRef,
): Promise<ValueFlow> {
  const { findingsOf, startOf } = flowAnalysis(resolver, candidates)
  const absorb = absorbed(target)

  const drained = async (trace: Trace): Promise<Trace> => {
    if (trace.queue.length === 0) return trace
    const [task, ...queue] = trace.queue
    const findings = await findingsOf(task)
    return drained(findings.reduce(absorb, { ...trace, queue }))
  }

  const trace = await drained((await startOf(target)).reduce(absorb, NOTHING_TRACED))

  return {
    invocations: [...trace.invocations].sort((a, b) => `${a.code.file}:${a.code.name}`.localeCompare(`${b.code.file}:${b.code.name}`)),
    escapes: [...trace.escapes].sort((a, b) => `${a.file}:${a.reason}`.localeCompare(`${b.file}:${b.reason}`)),
  }
}
