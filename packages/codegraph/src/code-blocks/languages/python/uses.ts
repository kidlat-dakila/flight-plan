import { NAMESPACE_IMPORT } from "@/ast-graph/languages/base"
import type { SyntaxNode } from "@/ast-graph/parser"
import type { ImportVariable } from "@/ast-graph/types"
import type { ResolvedReference, Resolution } from "@/code-blocks/languages/typescript/outline"
import { nodeAtRange } from "@/code-blocks/languages/typescript/syntax"
import type { HandingSlot, ReadHanding, ReadTarget, ReadUse, WrittenAt } from "@/code-blocks/reading"
import { fromSyntaxRange, rangeOfNode } from "@/code-blocks/source-range"
import type { SymbolUse } from "@/code-blocks/types"
import { callFilledByAnnotatedType } from "./annotated"
import { keyOfGetter, keyOfSubscript, listAttributeNames } from "./members"
import { resolutionAt, type PythonOutline } from "./outline"

interface NamedTarget {
  readonly target: ReadTarget
  readonly path: readonly string[]
}

interface ResolvedPath {
  readonly resolution: Resolution
  readonly path: readonly string[]
}

interface DottedImport {
  readonly variable: ImportVariable
  readonly submodules: readonly string[]
}

interface MemberChain {
  readonly outermost: SyntaxNode
  readonly path: readonly string[]
}

type Role = "call" | "value"

const MEMBER_TYPE = "attribute"
const CALL_TYPE = "call"
const NAME_TYPE = "identifier"
const DECORATOR_TYPE = "decorator"
const ARGUMENTS_TYPE = "argument_list"
const NAMED_ARGUMENT_TYPE = "keyword_argument"
const ANNOTATION_TYPE = "type"
const CLASS_TYPE = "class_definition"
const FUNCTION_TYPE = "function_definition"
const DECORATED_TYPE = "decorated_definition"
const RECEIVER_NAMES: ReadonlySet<string> = new Set(["self", "cls"])
const MODULE_SEPARATOR = "."
const ARGUMENT = "argument"
const FIRST_SLOT = 0

const isTypeUse = (used: SyntaxNode): boolean => used.closest([ANNOTATION_TYPE, CALL_TYPE])?.type === ANNOTATION_TYPE

const isChildAt = (node: SyntaxNode, field: string): boolean => node.parent?.childForFieldName(field)?.id === node.id

const targetOf = (resolution: Resolution): ReadTarget =>
  resolution.kind === "local"
    ? { kind: "local", declarationRange: fromSyntaxRange(resolution.declaration.range) }
    : {
        kind: "import",
        specifier: resolution.variable.specifier,
        importedName: resolution.variable.importedName,
        filePath: resolution.variable.importedFilePath,
      }

const memberReadFrom = (read: SyntaxNode): string | null => {
  const { parent } = read
  if (parent?.type === MEMBER_TYPE && isChildAt(read, "object")) return parent.childForFieldName("attribute")?.text ?? ""
  return keyOfSubscript(read)
}

const chainFrom = (name: SyntaxNode): MemberChain => {
  const member = memberReadFrom(name)
  if (member === null || name.parent === null) return { outermost: name, path: [] }
  const { outermost, path } = chainFrom(name.parent)
  return { outermost, path: [member, ...path] }
}

const keyChainFrom = (name: SyntaxNode): MemberChain | null => {
  const got = keyOfGetter(name)
  if (got !== null) {
    const { outermost, path } = keyChainFrom(got.call) ?? chainFrom(got.call)
    return { outermost, path: [got.key, ...path] }
  }
  const member = memberReadFrom(name)
  const further = member === null || name.parent === null ? null : keyChainFrom(name.parent)
  return member === null || further === null ? null : { outermost: further.outermost, path: [member, ...further.path] }
}

const isOpened = (target: ReadTarget): boolean => target.kind === "local" || target.filePath !== null

const readKeysGot = (used: SyntaxNode, target: ReadTarget): ReadUse[] => {
  const chain = isOpened(target) ? keyChainFrom(used) : null
  return chain === null ? [] : [{ usedAt: rangeOfNode(chain.outermost), use: "read", memberPath: chain.path, target, handing: null, writtenAt: writtenAtOf(chain.outermost) }]
}

const roleOf = (used: SyntaxNode): Role => {
  const { parent } = used
  if (parent?.type === DECORATOR_TYPE) return "call"
  return parent?.type === CALL_TYPE && isChildAt(used, "function") ? "call" : "value"
}

const slotOf = (used: SyntaxNode): HandingSlot | null => {
  const holder = used.parent
  if (holder?.type === NAMED_ARGUMENT_TYPE && isChildAt(used, "value")) return holder.childForFieldName("name")?.text ?? null
  if (holder?.type !== ARGUMENTS_TYPE || holder.parent?.type !== CALL_TYPE) return null
  return holder.namedChildren.filter((argument) => argument.type !== NAMED_ARGUMENT_TYPE).findIndex((argument) => argument.id === used.id)
}

const callHandedTo = (used: SyntaxNode): SyntaxNode | null => {
  const holder = used.parent?.type === NAMED_ARGUMENT_TYPE ? used.parent.parent : used.parent
  return holder?.type === ARGUMENTS_TYPE && holder.parent?.type === CALL_TYPE ? holder.parent : null
}

const handingInto = (call: SyntaxNode | null, slot: HandingSlot | null, outline: PythonOutline): ReadHanding | null => {
  const callee = call?.childForFieldName("function") ?? null
  const resolution = callee?.type === NAME_TYPE ? resolutionAt(outline, callee) : null
  return slot === null || resolution === null ? null : { receiver: targetOf(resolution), slot }
}

const handingOf = (used: SyntaxNode, outline: PythonOutline): ReadHanding | null => handingInto(callHandedTo(used), slotOf(used), outline)

const isBaseOfClass = (used: SyntaxNode): boolean => used.parent?.parent?.type === CLASS_TYPE && isChildAt(used.parent, "superclasses")

const writtenAtOf = (used: SyntaxNode): WrittenAt => ({ slot: slotOf(used), keyPath: [], isSpread: false, isBase: isBaseOfClass(used) })

const useOf = (role: Role, memberPath: readonly string[]): SymbolUse => (role === "value" && memberPath.length > 0 ? "read" : role)

const isNamespaceOfFile = (target: ReadTarget, path: readonly string[]): boolean =>
  target.kind === "import" && target.filePath !== null && target.importedName === NAMESPACE_IMPORT && path.length > 0

const listMethodNames = (holder: SyntaxNode | null): SyntaxNode[] =>
  (holder?.childForFieldName("body")?.namedChildren ?? []).flatMap((member) => {
    const definition = member.type === DECORATED_TYPE ? member.childForFieldName("definition") : member
    const name = definition?.type === FUNCTION_TYPE ? definition.childForFieldName("name") : null
    return name === null ? [] : [name]
  })

const isReceiver = (used: SyntaxNode, resolution: Resolution): boolean =>
  RECEIVER_NAMES.has(used.text) && resolution.kind === "local" && resolution.declaration.declarationType === ARGUMENT

const classOfReceiver = (used: SyntaxNode, resolution: Resolution, path: readonly string[]): SyntaxNode | null =>
  isReceiver(used, resolution) && path.length > 0 ? used.closest(CLASS_TYPE) : null

const findMethodOfReceiver = (used: SyntaxNode, resolution: Resolution, path: readonly string[]): SyntaxNode | null => {
  const holder = classOfReceiver(used, resolution, path)
  return [...listMethodNames(holder), ...listAttributeNames(holder)].find((name) => name.text === path[0]) ?? null
}

const throughNamespace = (named: NamedTarget): NamedTarget => {
  const { target, path } = named
  return target.kind === "import" && isNamespaceOfFile(target, path) ? { target: { ...target, importedName: path[0] }, path: path.slice(1) } : named
}

const submodulesOf = ({ name, specifier, importedName }: ImportVariable): readonly string[] => {
  const [boundModule, ...submodules] = specifier.split(MODULE_SEPARATOR)
  return importedName === NAMESPACE_IMPORT && boundModule === name ? submodules : []
}

const startsWith = (path: readonly string[], prefix: readonly string[]): boolean => prefix.every((segment, index) => path[index] === segment)

const longerImport = (longest: DottedImport | null, candidate: DottedImport): DottedImport =>
  longest === null || candidate.submodules.length > longest.submodules.length ? candidate : longest

const throughDottedImport = ({ resolution, path }: ResolvedPath, outline: PythonOutline): ResolvedPath => {
  if (resolution.kind !== "import" || submodulesOf(resolution.variable).length === 0) return { resolution, path }
  const followed = outline.imports
    .filter((variable) => variable.name === resolution.variable.name)
    .map((variable) => ({ variable, submodules: submodulesOf(variable) }))
    .filter(({ submodules }) => submodules.length > 0 && startsWith(path, submodules))
    .reduce<DottedImport | null>(longerImport, null)
  return followed === null ? { resolution, path } : { resolution: { kind: "import", variable: followed.variable }, path: path.slice(followed.submodules.length) }
}

const rootNameOf = (written: SyntaxNode): SyntaxNode | null => {
  if (written.type === NAME_TYPE) return written
  const object = written.type === MEMBER_TYPE ? written.childForFieldName("object") : null
  return object === null ? null : rootNameOf(object)
}

const baseTargetOf = (base: SyntaxNode, outline: PythonOutline): ReadTarget[] => {
  const name = rootNameOf(base)
  const found = name === null ? null : resolutionAt(outline, name)
  if (name === null || found === null) return []
  const { resolution, path: modulePath } = throughDottedImport({ resolution: found, path: chainFrom(name).path }, outline)
  const { target, path } = throughNamespace({ target: targetOf(resolution), path: modulePath })
  return path.length === 0 ? [target] : []
}

const listBaseTargets = (holder: SyntaxNode | null, outline: PythonOutline): ReadTarget[] =>
  (holder?.childForFieldName("superclasses")?.namedChildren ?? []).flatMap((base) => baseTargetOf(base, outline))

const readUses = ({ reference, resolution: found }: ResolvedReference, outline: PythonOutline): ReadUse[] => {
  const used = nodeAtRange(outline.tree, reference.range)
  const chain = chainFrom(used)
  const { outermost } = chain
  const { resolution, path } = throughDottedImport({ resolution: found, path: chain.path }, outline)
  const target = targetOf(resolution)
  const role = roleOf(outermost)
  const usedAt = rangeOfNode(outermost)
  const writtenAt = writtenAtOf(outermost)
  const method = findMethodOfReceiver(used, resolution, path)
  if (method !== null) {
    const memberPath = path.slice(1)
    return [{ usedAt, use: useOf(role, memberPath), memberPath, target: { kind: "local", declarationRange: rangeOfNode(method) }, handing: null, writtenAt }]
  }
  const bases = listBaseTargets(classOfReceiver(used, resolution, path), outline)
  if (bases.length > 0) return bases.map((base) => ({ usedAt, use: useOf(role, path), memberPath: path, target: base, handing: null, writtenAt }))
  const filled = handingInto(callFilledByAnnotatedType(outermost), FIRST_SLOT, outline)
  if (filled !== null) return [{ usedAt, use: "value", memberPath: path, target, handing: filled, writtenAt }]
  if (isTypeUse(outermost)) return [{ usedAt, use: "type", memberPath: path, target, handing: null, writtenAt }]
  const named = throughNamespace({ target, path })
  if (named.target !== target) return [{ usedAt, use: useOf(role, named.path), memberPath: named.path, target: named.target, handing: null, writtenAt }]
  return [{ usedAt, use: useOf(role, path), memberPath: path, target, handing: role === "value" ? handingOf(outermost, outline) : null, writtenAt }, ...readKeysGot(used, target)]
}

export const readPythonUses = (outline: PythonOutline): ReadUse[] => outline.resolved.flatMap((resolved) => readUses(resolved, outline))
