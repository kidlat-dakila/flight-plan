import type { Node, Tree } from "web-tree-sitter"
import type { CallCandidates } from "@/core/tracer/language"
import type { CodeRef, EscapeKind, Pos, Range } from "@/core/types"
import type { Resolver } from "./call-graph"
import { declarationsIn } from "./declarations"
import { importBindingsOf } from "./imports"

export interface Invocation {
  code: CodeRef
  calledAt: Range
  via: "call" | "value"
}

export interface Escape { reason: EscapeKind, at: Range, file: string }

export interface ValueFlow { invocations: Invocation[], escapes: Escape[] }

const ROUTE_DECORATORS = new Set(["route", "get", "post", "put", "delete", "patch", "command", "task", "get_route"])
const ROUTE_FUNCS = new Set(["path", "re_path", "url", "add_url_rule", "add_command", "set_defaults"])
const STORE_METHODS = new Set(["register", "add", "append", "setdefault", "__setitem__"])
const BUS_METHODS = new Set(["connect", "subscribe", "on", "listen", "add_handler", "signal"])
const IMPORT_METHODS = new Set(["import_module"])
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

type Task
  = | { kind: "binding", file: string, name: string, isHandoff: boolean }
    | { kind: "collection", file: string, name: string }
    | { kind: "returns", fn: CodeRef }

type Finding
  = | { kind: "invocation", invocation: Invocation, isSelfAllowed: boolean }
    | { kind: "escape", escape: Escape }
    | { kind: "task", task: Task }

interface Use { file: string, tree: Tree, decls: readonly CodeRef[] }

interface Trace {
  queue: readonly Task[]
  queued: ReadonlySet<string>
  invocations: readonly Invocation[]
  invoked: ReadonlySet<string>
  escapes: readonly Escape[]
  escaped: ReadonlySet<string>
}

const LINE_WEIGHT = 1e6
const SPLATS = new Set(["list_splat", "dictionary_splat"])
const COLLECTIONS = new Set(["list", "set", "tuple"])
const PATTERNS = new Set(["pattern_list", "tuple_pattern", "tuple"])

const rangeOf = (node: Node): Range => ({
  start: { line: node.startPosition.row + 1, column: node.startPosition.column },
  end: { line: node.endPosition.row + 1, column: node.endPosition.column },
})

const same = (a: Node | null | undefined, b: Node | null | undefined): boolean => a?.id !== undefined && a.id === b?.id

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

function identifiersIn(node: Node, name: string): Node[] {
  const own = node.type === "identifier" && node.text === name ? [node] : []
  return [...own, ...node.namedChildren.flatMap((child) => identifiersIn(child, name))]
}

const identifiersNamed = (tree: Tree, name: string): Node[] => identifiersIn(tree.rootNode, name)

const inImport = (node: Node): boolean => {
  for (let p = node.parent; p !== null; p = p.parent) {
    if (p.type === "import_statement" || p.type === "import_from_statement") return true
  }
  return false
}

const insideFunction = (node: Node): boolean => {
  for (let p = node.parent; p !== null; p = p.parent) if (p.type === "function_definition") return true
  return false
}

function boundNames(pattern: Node | null): string[] {
  if (pattern === null) return []
  if (pattern.type === "identifier") return [pattern.text]
  return PATTERNS.has(pattern.type) ? pattern.namedChildren.filter((child) => child.type === "identifier").map((child) => child.text) : []
}

const assignmentFor = (node: Node | null): Node | null =>
  node?.parent?.type === "assignment" && same(node.parent.childForFieldName("right"), node) ? node.parent : null

function decoratorHead(node: Node | null): string {
  if (node === null) return ""
  if (node.type === "identifier") return node.text
  if (node.type === "attribute") return node.childForFieldName("attribute")?.text ?? ""
  return node.type === "call" ? decoratorHead(node.childForFieldName("function")) : ""
}

function paramName(param: Node): string | null {
  if (param.type === "identifier") return param.text
  const named = param.childForFieldName("name")
  if (named?.type === "identifier") return named.text
  return param.namedChildren.find((child) => child.type === "identifier")?.text ?? null
}

function findParams(node: Node, name: string): Node | null {
  if (node.type === "function_definition" && node.childForFieldName("name")?.text === name) return node.childForFieldName("parameters")
  return node.namedChildren.reduce<Node | null>((found, child) => found ?? findParams(child, name), null)
}

const paramsOf = (tree: Tree, name: string): Node[] => findParams(tree.rootNode, name)?.namedChildren ?? []

function decoratorsOf(node: Node, target: CodeRef): Node[] {
  const nameNode = node.type === "decorated_definition" ? node.childForFieldName("definition")?.childForFieldName("name") : null
  const isDecorated = nameNode?.startPosition.row === target.definedAt.start.line - 1
  const own = isDecorated ? node.namedChildren.filter((child) => child.type === "decorator") : []
  return [...own, ...node.namedChildren.flatMap((child) => decoratorsOf(child, target))]
}

const taskKey = (task: Task): string => {
  if (task.kind === "binding") return `b:${task.file}:${task.name}:${String(task.isHandoff)}`
  return task.kind === "collection" ? `c:${task.file}:${task.name}` : `r:${task.fn.file}:${String(task.fn.definedAt.start.line)}`
}

const invoked = (code: CodeRef | undefined, calledAt: Range, via: Invocation["via"]): Finding[] =>
  code === undefined ? [] : [{ kind: "invocation", invocation: { code, calledAt, via }, isSelfAllowed: false }]

const escapedAt = (reason: EscapeKind, at: Range, file: string): Finding[] => [{ kind: "escape", escape: { reason, at, file } }]

const bindingOf = (file: string, name: string, isHandoff: boolean): Finding[] => [{ kind: "task", task: { kind: "binding", file, name, isHandoff } }]

const collectionOf = (file: string, holder: Node | null): Finding[] => {
  const bound = assignmentFor(holder)?.childForFieldName("left")
  return bound?.type === "identifier" ? [{ kind: "task", task: { kind: "collection", file, name: bound.text } }] : []
}

const returnsOf = (fn: CodeRef | undefined): Finding[] => (fn === undefined ? [] : [{ kind: "task", task: { kind: "returns", fn } }])

const invocationKey = ({ code, via }: Invocation): string => `${code.file}:${String(code.definedAt.start.line)}:${via}`

const escapeKey = ({ reason, at, file }: Escape): string => `${file}:${String(at.start.line)}:${String(at.start.column)}:${reason}`

const isTarget = (code: CodeRef, target: CodeRef): boolean =>
  code.file === target.file && code.definedAt.start.line === target.definedAt.start.line

const withInvocation = (trace: Trace, invocation: Invocation, isSkipped: boolean): Trace => {
  const key = invocationKey(invocation)
  if (isSkipped || trace.invoked.has(key)) return trace
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
  if (finding.kind === "invocation") {
    return withInvocation(trace, finding.invocation, !finding.isSelfAllowed && isTarget(finding.invocation.code, target))
  }
  return finding.kind === "escape" ? withEscape(trace, finding.escape) : withTask(trace, finding.task)
}

const NOTHING_TRACED: Trace = { queue: [], queued: new Set(), invocations: [], invoked: new Set(), escapes: [], escaped: new Set() }

function flowAnalysis(
  resolver: Resolver,
  candidates: CallCandidates,
  target: CodeRef,
): { findingsOf: (task: Task) => Promise<Finding[]>, startOf: () => Promise<Finding[]> } {
  const useOf = async (file: string): Promise<Use | null> => {
    const tree = await resolver.treeOf(file)
    return tree === null ? null : { file, tree, decls: await resolver.declarationsOf(file) }
  }

  const registerSink = (decls: readonly CodeRef[], callRange: Range, at: Range): Finding[] => {
    const site = enclosing(decls, callRange)
    if (site !== undefined) return invoked(site, at, "value")
    return [{ kind: "invocation", invocation: { code: target, calledAt: at, via: "value" }, isSelfAllowed: true }]
  }

  const resolveName = async (file: string, name: string): Promise<string | null> => {
    const tree = await resolver.treeOf(file)
    if (tree === null) return null
    if (declarationsIn(tree).some((decl) => decl.name === name || decl.name.endsWith(`.${name}`))) return file
    const binding = importBindingsOf(tree).find((one) => one.local === name && !one.typeOnly)
    return binding === undefined ? null : resolver.resolveModule(file, binding.module, binding.level, binding.imported)
  }

  const paramNameAt = async (file: string, name: string, index: number): Promise<string | null> => {
    const tree = await resolver.treeOf(file)
    const params = tree === null ? [] : paramsOf(tree, name)
    return index < 0 || index >= params.length ? null : paramName(params[index])
  }

  const hasParamNamed = async (file: string, name: string, param: string): Promise<boolean> => {
    const tree = await resolver.treeOf(file)
    return tree !== null && paramsOf(tree, name).some((one) => paramName(one) === param)
  }

  const absorbsKwargs = async (file: string, name: string): Promise<boolean> => {
    const tree = await resolver.treeOf(file)
    return tree !== null && paramsOf(tree, name).some((one) => one.type === "dictionary_splat_pattern")
  }

  const handedToMethod = ({ file, decls }: Use, ref: Node, call: Node, callee: Node): Finding[] => {
    const at = rangeOf(ref)
    const method = callee.childForFieldName("attribute")?.text ?? ""
    const receiver = callee.childForFieldName("object")?.text ?? ""
    if (ROUTE_FUNCS.has(method)) return registerSink(decls, rangeOf(call), at)
    if (IMPORT_METHODS.has(method) || receiver === "importlib") return escapedAt("import", at, file)
    if (STORE_METHODS.has(method)) return escapedAt("store", at, file)
    return escapedAt(BUS_METHODS.has(method) ? "event-bus" : "library", at, file)
  }

  const handedByKeyword = async (file: string, ref: Node, to: string, name: string, keyword: string): Promise<Finding[]> => {
    if (await hasParamNamed(to, name, keyword)) return bindingOf(to, keyword, true)
    return escapedAt((await absorbsKwargs(to, name)) ? "spread" : "library", rangeOf(ref), file)
  }

  const handedByPosition = async (file: string, ref: Node, call: Node, args: Node, to: string, name: string): Promise<Finding[]> => {
    const resultNames = boundNames(assignmentFor(call)?.childForFieldName("left") ?? null)
    if (resultNames.length > 0) return resultNames.flatMap((result) => bindingOf(file, result, true))
    const param = await paramNameAt(to, name, args.namedChildren.findIndex((child) => same(child, ref)))
    return param === null ? [] : bindingOf(to, param, true)
  }

  const handedToFunction = async (use: Use, ref: Node, call: Node, args: Node, name: string, keyword: string | null): Promise<Finding[]> => {
    const at = rangeOf(ref)
    if (ROUTE_FUNCS.has(name)) return registerSink(use.decls, rangeOf(call), at)
    if (name === "__import__") return escapedAt("import", at, use.file)
    const to = await resolveName(use.file, name)
    if (to === null) return escapedAt("library", at, use.file)
    return keyword === null ? handedByPosition(use.file, ref, call, args, to, name) : handedByKeyword(use.file, ref, to, name, keyword)
  }

  const handleArg = async (use: Use, ref: Node, call: Node, args: Node, keyword: string | null): Promise<Finding[]> => {
    const callee = call.childForFieldName("function")
    if (callee?.type === "attribute") return handedToMethod(use, ref, call, callee)
    return callee?.type === "identifier" ? handedToFunction(use, ref, call, args, callee.text, keyword) : []
  }

  const assignedUse = ({ file }: Use, ref: Node, parent: Node, isHandoff: boolean): Finding[] => {
    const left = parent.childForFieldName("left")
    const isStored = left?.type === "attribute" || (left?.type === "identifier" && !insideFunction(parent))
    return isStored ? escapedAt("store", rangeOf(ref), file) : boundNames(left).flatMap((name) => bindingOf(file, name, isHandoff))
  }

  const decoratedUse = ({ file, decls }: Use, ref: Node): Finding[] => {
    const at = rangeOf(ref)
    const site = enclosing(decls, at)
    return site === undefined ? escapedAt("decorator", at, file) : invoked(site, at, "value")
  }

  const passedUse = async (use: Use, ref: Node, parent: Node): Promise<Finding[]> => {
    const call = parent.parent
    if (parent.type === "argument_list" && call?.type === "call") return handleArg(use, ref, call, parent, null)
    const isKeywordValue = parent.type === "keyword_argument" && same(parent.childForFieldName("value"), ref)
    const outerCall = call?.parent
    if (isKeywordValue && call?.type === "argument_list" && outerCall?.type === "call") {
      return handleArg(use, ref, outerCall, call, parent.childForFieldName("name")?.text ?? null)
    }
    if (COLLECTIONS.has(parent.type)) return collectionOf(use.file, parent)
    return parent.type === "pair" && same(parent.childForFieldName("value"), ref) ? collectionOf(use.file, call) : []
  }

  const heldUse = async (use: Use, ref: Node, parent: Node, isHandoff: boolean): Promise<Finding[]> => {
    if (parent.type === "assignment" && same(parent.childForFieldName("right"), ref)) return assignedUse(use, ref, parent, isHandoff)
    if (parent.type === "return_statement") return returnsOf(enclosing(use.decls, rangeOf(ref)))
    return SPLATS.has(parent.type) ? escapedAt("spread", rangeOf(ref), use.file) : passedUse(use, ref, parent)
  }

  const bindingUse = async (use: Use, ref: Node, isHandoff: boolean): Promise<Finding[]> => {
    const parent = ref.parent
    if (inImport(ref) || parent === null) return []
    if (parent.type === "function_definition" && same(parent.childForFieldName("name"), ref)) return []
    if (parent.type === "call" && same(parent.childForFieldName("function"), ref)) {
      return invoked(enclosing(use.decls, rangeOf(ref)), rangeOf(ref), isHandoff ? "value" : "call")
    }
    return parent.type === "decorator" ? decoratedUse(use, ref) : heldUse(use, ref, parent, isHandoff)
  }

  const analyzeBinding = async (file: string, name: string, isHandoff: boolean): Promise<Finding[]> => {
    const use = await useOf(file)
    if (use === null) return []
    const found = await Promise.all(identifiersNamed(use.tree, name).map(async (ref) => bindingUse(use, ref, isHandoff)))
    return found.flat()
  }

  const collectionUse = ({ file, decls }: Use, ref: Node): Finding[] => {
    const parent = ref.parent
    if (inImport(ref) || parent === null) return []
    if (parent.type === "assignment" && same(parent.childForFieldName("left"), ref)) return []
    if (parent.type !== "subscript" || !same(parent.childForFieldName("value"), ref)) {
      return SPLATS.has(parent.type) ? escapedAt("spread", rangeOf(ref), file) : []
    }
    const call = parent.parent
    if (call?.type !== "call" || !same(call.childForFieldName("function"), parent)) return []
    const index = parent.childForFieldName("subscript")
    const at = rangeOf(parent)
    return index?.type === "integer" || index?.type === "string" ? registerSink(decls, at, at) : escapedAt("dynamic-dispatch", at, file)
  }

  const analyzeCollection = async (file: string, name: string): Promise<Finding[]> => {
    const use = await useOf(file)
    return use === null ? [] : identifiersNamed(use.tree, name).flatMap((ref) => collectionUse(use, ref))
  }

  const returnedCallOf = ({ decls }: Use, ref: Node): Finding[] => {
    const call = ref.parent
    if (inImport(ref) || call?.type !== "call" || !same(call.childForFieldName("function"), ref)) return []
    const outer = call.parent
    const isCalled = outer?.type === "call" && same(outer.childForFieldName("function"), call)
    return isCalled ? invoked(enclosing(decls, rangeOf(call)), rangeOf(call), "value") : []
  }

  const returnsIn = async (file: string, fn: CodeRef): Promise<Finding[]> => {
    const use = await useOf(file)
    if (use === null) return []
    const searches = await resolver.localNamesFor(file, fn)
    return searches
      .filter((search) => search.receiver === null)
      .flatMap((search) => identifiersNamed(use.tree, search.name).flatMap((ref) => returnedCallOf(use, ref)))
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

  const decoratorFinding = (decls: readonly CodeRef[], decorator: Node): Finding[] => {
    const head = decoratorHead(decorator.namedChildren.length === 0 ? null : decorator.namedChildren[0])
    const at = rangeOf(decorator)
    if (ROUTE_DECORATORS.has(head)) return registerSink(decls, at, at)
    return head !== "" && !TRANSPARENT_DECORATORS.has(head) ? escapedAt("decorator", at, target.file) : []
  }

  const seedDecorators = async (): Promise<Finding[]> => {
    const use = await useOf(target.file)
    return use === null ? [] : decoratorsOf(use.tree.rootNode, target).flatMap((decorator) => decoratorFinding(use.decls, decorator))
  }

  const usesIn = async (file: string): Promise<Finding[]> => {
    const searches = await resolver.localNamesFor(file, target)
    const found = await Promise.all(
      searches.map(async (search) =>
        search.receiver === null ? bindingOf(file, search.name, false) : namespaceCalls(file, search.name, search.receiver),
      ),
    )
    return found.flat()
  }

  const startOf = async (): Promise<Finding[]> => {
    const files = await candidates(target)
    const used = await Promise.all(files.map(usesIn))
    return [...used.flat(), ...(await seedDecorators())]
  }

  const findingsOf = async (task: Task): Promise<Finding[]> => {
    if (task.kind === "binding") return analyzeBinding(task.file, task.name, task.isHandoff)
    return task.kind === "collection" ? analyzeCollection(task.file, task.name) : analyzeReturns(task.fn)
  }

  return { findingsOf, startOf }
}

export async function traceValueFlow(
  resolver: Resolver,
  candidates: CallCandidates,
  target: CodeRef,
): Promise<ValueFlow> {
  const { findingsOf, startOf } = flowAnalysis(resolver, candidates, target)
  const absorb = absorbed(target)

  const drained = async (trace: Trace): Promise<Trace> => {
    if (trace.queue.length === 0) return trace
    const [task, ...queue] = trace.queue
    const findings = await findingsOf(task)
    return drained(findings.reduce(absorb, { ...trace, queue }))
  }

  const trace = await drained((await startOf()).reduce(absorb, NOTHING_TRACED))

  return {
    invocations: [...trace.invocations].sort((a, b) => `${a.code.file}:${a.code.name}`.localeCompare(`${b.code.file}:${b.code.name}`)),
    escapes: [...trace.escapes].sort((a, b) => `${a.file}:${a.reason}`.localeCompare(`${b.file}:${b.reason}`)),
  }
}
