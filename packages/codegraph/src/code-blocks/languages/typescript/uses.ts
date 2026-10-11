import { NAMESPACE_IMPORT } from "@/ast-graph/languages/base"
import { isFieldOf, isSameNode } from "@/ast-graph/languages/typescript/syntax"
import type { SyntaxNode, SyntaxTree } from "@/ast-graph/parser"
import { isSameRange, rangeOf } from "@/ast-graph/source-range"
import type { SymbolSpace } from "@/ast-graph/types"
import { WRITTEN_NOWHERE, type ReadHanding, type ReadTarget, type ReadUse } from "@/code-blocks/reading"
import { fromSyntaxRange, rangeOfNode } from "@/code-blocks/source-range"
import type { SymbolUse } from "@/code-blocks/types"
import { classBodyBoundTo, listMemberNames } from "./class-members"
import { attributeNameOf, COLLECTION_METHODS, FUNCTION_TYPES, listArguments, methodNameOf } from "./markup"
import { isFileWideDeclaration, resolutionOf, type FileOutline, type ResolvedReference, type Resolution } from "./outline"
import { nodeAtRange } from "./syntax"
import { writtenAtOf } from "./written-at"

interface MemberChain {
  readonly outermost: SyntaxNode
  readonly path: readonly string[]
}

type Role = "call" | "render" | "value"

const VALUE_SPACE: SymbolSpace = "value"
const MEMBER_TYPE = "member_expression"
const NAME_TYPE = "identifier"
const CALL_TYPE = "call_expression"
const CONSTRUCTION_TYPE = "new_expression"
const ARGUMENTS_TYPE = "arguments"
const SHORTHAND_BINDING_TYPE = "shorthand_property_identifier_pattern"
const KEYED_BINDING_TYPE = "pair_pattern"
const DEFAULTING_BINDING_TYPE = "object_assignment_pattern"
const OBJECT_PATTERN_TYPE = "object_pattern"
const DECLARATOR_TYPE = "variable_declarator"
const EXPRESSION_HOLDER_TYPE = "jsx_expression"
const ATTRIBUTE_TYPE = "jsx_attribute"
const PROMISE_METHODS: ReadonlySet<string> = new Set(["then", "catch", "finally"])
const OPENING_TAG_TYPE = "jsx_opening_element"
const RECEIVER_TYPE = "this"
const BASE_RECEIVER_TYPE = "super"
const RECEIVER_TYPES: readonly string[] = [RECEIVER_TYPE, BASE_RECEIVER_TYPE]
const HERITAGE_TYPE = "class_heritage"
const EXTENDING_TYPE = "extends_clause"
const ELEMENT_TAG_TYPES: ReadonlySet<string> = new Set([OPENING_TAG_TYPE, "jsx_self_closing_element"])

export const targetOf = (resolution: Resolution): ReadTarget =>
  resolution.kind === "local"
    ? { kind: "local", declarationRange: fromSyntaxRange(resolution.declaration.range) }
    : {
        kind: "import",
        specifier: resolution.variable.specifier,
        importedName: resolution.variable.importedName,
        filePath: resolution.variable.importedFilePath,
      }

export const chainFrom = (name: SyntaxNode): MemberChain => {
  const { parent } = name
  if (parent?.type !== MEMBER_TYPE || !isFieldOf(name, "object")) return { outermost: name, path: [] }
  const { outermost, path } = chainFrom(parent)
  return { outermost, path: [parent.childForFieldName("property")?.text ?? "", ...path] }
}

const isRunInPlace = (passed: SyntaxNode): boolean => {
  const call = passed.parent?.type === ARGUMENTS_TYPE ? passed.parent.parent : null
  const method = call?.type === CALL_TYPE ? methodNameOf(call) : null
  return method !== null && (COLLECTION_METHODS.has(method) || PROMISE_METHODS.has(method))
}

export const roleOf = (used: SyntaxNode): Role => {
  const { parent } = used
  if (parent === null) return "value"
  if (isRunInPlace(used)) return "call"
  if (ELEMENT_TAG_TYPES.has(parent.type) && isFieldOf(used, "name")) return "render"
  if (parent.type === CALL_TYPE && isFieldOf(used, "function")) return "call"
  return parent.type === CONSTRUCTION_TYPE && isFieldOf(used, "constructor") ? "call" : "value"
}

const receiverOf = (name: SyntaxNode | null, outline: FileOutline): ReadTarget | null => {
  const resolution = name?.type === NAME_TYPE ? resolutionOf(outline, name) : null
  return resolution === null ? null : targetOf(resolution)
}

const handingToElement = (expression: SyntaxNode, outline: FileOutline): ReadHanding | null => {
  const attribute = expression.parent
  const tag = attribute?.type === ATTRIBUTE_TYPE ? attribute.parent : null
  const slot = attribute === null ? null : attributeNameOf(attribute)
  const receiver = tag === null ? null : receiverOf(tag.childForFieldName("name"), outline)
  return receiver === null || slot === null ? null : { receiver, slot }
}

const handingToCall = (passed: SyntaxNode, passedTo: SyntaxNode, outline: FileOutline): ReadHanding | null => {
  const call = passedTo.parent
  const receiver = call?.type === CALL_TYPE ? receiverOf(call.childForFieldName("function"), outline) : null
  if (receiver === null) return null
  return { receiver, slot: passedTo.namedChildren.findIndex((argument) => isSameNode(argument, passed)) }
}

const handingOf = (used: SyntaxNode, outline: FileOutline): ReadHanding | null => {
  const { parent } = used
  if (parent?.type === EXPRESSION_HOLDER_TYPE) return handingToElement(parent, outline)
  return parent?.type === ARGUMENTS_TYPE ? handingToCall(used, parent, outline) : null
}

export const useOf = (role: Role, memberPath: readonly string[]): SymbolUse => (role === "value" && memberPath.length > 0 ? "read" : role)

const isNamespaceOfFile = (target: ReadTarget, path: readonly string[]): boolean =>
  target.kind === "import" && target.filePath !== null && target.importedName === NAMESPACE_IMPORT && path.length > 0

const keyOfBinding = (binding: SyntaxNode): string | null => {
  if (binding.type === SHORTHAND_BINDING_TYPE) return binding.text
  const { parent } = binding
  return parent?.type === KEYED_BINDING_TYPE && isFieldOf(binding, "value") ? (parent.childForFieldName("key")?.text ?? null) : null
}

const takenApartIn = (binding: SyntaxNode): SyntaxNode | null => {
  const holder = binding.type === SHORTHAND_BINDING_TYPE ? binding.parent : (binding.parent?.parent ?? null)
  return holder?.type === DEFAULTING_BINDING_TYPE ? holder.parent : holder
}

const keysAbove = (pattern: SyntaxNode | null): string[] | null => {
  if (pattern?.type !== OBJECT_PATTERN_TYPE) return null
  const holder = pattern.parent
  if (holder?.type === DECLARATOR_TYPE) return []
  const outer = holder?.type === KEYED_BINDING_TYPE && isFieldOf(pattern, "value") ? keysAbove(holder.parent) : null
  return outer === null || holder === null ? null : [...outer, holder.childForFieldName("key")?.text ?? ""]
}

const keyTakenFrom = (resolution: Resolution, declaredIn: SyntaxTree): string[] => {
  if (resolution.kind !== "local") return []
  const binding = nodeAtRange(declaredIn, resolution.declaration.range)
  const key = keyOfBinding(binding)
  const outerKeys = keysAbove(takenApartIn(binding))
  return key !== null && outerKeys !== null ? [...outerKeys, key] : []
}

const readUse = ({ reference, resolution }: ResolvedReference, outline: FileOutline, declaredIn: SyntaxTree): ReadUse => {
  const name = nodeAtRange(outline.tree, reference.range)
  const chain = chainFrom(name)
  const { outermost } = chain
  const path = [...keyTakenFrom(resolution, declaredIn), ...chain.path]
  const target = targetOf(resolution)
  const role = roleOf(outermost)
  const usedAt = rangeOfNode(outermost)
  const writtenAt = writtenAtOf(outermost)
  if (!reference.spaces.includes(VALUE_SPACE)) return { usedAt, use: "type", memberPath: path, target, handing: null, writtenAt: WRITTEN_NOWHERE }
  if (target.kind === "import" && isNamespaceOfFile(target, path)) {
    const [importedName, ...memberPath] = path
    return { usedAt, use: useOf(role, memberPath), memberPath, target: { ...target, importedName }, handing: null, writtenAt }
  }
  const use = useOf(role, path)
  return { usedAt, use, memberPath: path, target, handing: role === "value" ? handingOf(outermost, outline) : null, writtenAt }
}

const firstParameterOf = (callback: SyntaxNode): SyntaxNode | null => {
  const listed = callback.childForFieldName("parameters")?.namedChildren ?? []
  const name = callback.childForFieldName("parameter") ?? (listed.length === 0 ? null : listed[0].childForFieldName("pattern"))
  return name?.type === NAME_TYPE ? name : null
}

const isDeclaredForFile = (resolution: Resolution, outline: FileOutline): boolean =>
  resolution.kind === "import" || isFileWideDeclaration(outline, resolution.declaration)

const readPartsTaken = (parameter: SyntaxNode, madeBy: Resolution, outline: FileOutline): ReadUse[] => {
  const declaration = outline.declarations.find((candidate) => isSameRange(candidate.range, rangeOf(parameter)))
  return outline.resolved
    .filter(({ resolution }) => resolution.kind === "local" && resolution.declaration === declaration)
    .map(({ reference }) => chainFrom(nodeAtRange(outline.tree, reference.range)))
    .filter(({ path }) => path.length > 0)
    .map(({ outermost, path }) => ({
      usedAt: rangeOfNode(outermost),
      use: useOf(roleOf(outermost), path),
      memberPath: path,
      target: targetOf(madeBy),
      handing: null,
      writtenAt: WRITTEN_NOWHERE,
    }))
}

const readCallbackUses = ({ reference, resolution }: ResolvedReference, outline: FileOutline): ReadUse[] => {
  const called = nodeAtRange(outline.tree, reference.range)
  const call = called.parent
  if (call === null || roleOf(called) !== "call" || call.type !== CALL_TYPE || !isDeclaredForFile(resolution, outline)) return []
  return listArguments(call)
    .filter((argument) => FUNCTION_TYPES.has(argument.type))
    .flatMap((callback) => {
      const parameter = firstParameterOf(callback)
      return parameter === null ? [] : readPartsTaken(parameter, resolution, outline)
    })
}

const listChildCallbacks = (tag: SyntaxNode): SyntaxNode[] =>
  (tag.parent?.namedChildren ?? []).flatMap((child) => {
    const written = child.type === EXPRESSION_HOLDER_TYPE ? child.firstNamedChild : null
    return written !== null && FUNCTION_TYPES.has(written.type) ? [written] : []
  })

const readChildCallbackUses = ({ reference, resolution }: ResolvedReference, outline: FileOutline): ReadUse[] => {
  const { outermost, path } = chainFrom(nodeAtRange(outline.tree, reference.range))
  const tag = outermost.parent
  if (tag?.type !== OPENING_TAG_TYPE || path.length === 0 || !isFieldOf(outermost, "name")) return []
  return listChildCallbacks(tag).flatMap((callback) => {
    const parameter = firstParameterOf(callback)
    const taken = parameter === null ? [] : readPartsTaken(parameter, resolution, outline)
    return taken.map((use) => ({ ...use, memberPath: [...path, ...use.memberPath] }))
  })
}

const findMemberNamed = (classBody: SyntaxNode, name: string): SyntaxNode | null =>
  listMemberNames(classBody).find((declared) => declared.text === name) ?? null

const baseTargetsOf = (classBody: SyntaxNode, outline: FileOutline): ReadTarget[] =>
  (classBody.parent?.namedChildren ?? [])
    .filter((child) => child.type === HERITAGE_TYPE)
    .flatMap((heritage) => heritage.namedChildren.map((clause) => (clause.type === EXTENDING_TYPE ? clause.childForFieldName("value") : clause)))
    .flatMap((base) => receiverOf(base, outline) ?? [])

const readReceiverUse = (receiver: SyntaxNode, outline: FileOutline): ReadUse[] => {
  const { outermost, path } = chainFrom(receiver)
  const classBody = path.length === 0 ? null : classBodyBoundTo(receiver)
  if (classBody === null) return []
  const usage = { usedAt: rangeOfNode(outermost), handing: null, writtenAt: writtenAtOf(outermost) }
  const role = roleOf(outermost)
  const memberName = receiver.type === RECEIVER_TYPE ? findMemberNamed(classBody, path[0]) : null
  if (memberName !== null) {
    const memberPath = path.slice(1)
    return [{ ...usage, use: useOf(role, memberPath), memberPath, target: { kind: "local", declarationRange: rangeOfNode(memberName) } }]
  }
  return baseTargetsOf(classBody, outline).map((target) => ({ ...usage, use: useOf(role, path), memberPath: path, target }))
}

const listReceivers = (outline: FileOutline): SyntaxNode[] => RECEIVER_TYPES.flatMap((type) => outline.tree.rootNode.descendantsOfType(type))

export const readUses = (outline: FileOutline, declaredIn: SyntaxTree = outline.tree): ReadUse[] => [
  ...listReceivers(outline).flatMap((receiver) => readReceiverUse(receiver, outline)),
  ...outline.resolved.map((resolved) => readUse(resolved, outline, declaredIn)),
  ...outline.resolved.flatMap((resolved) => readCallbackUses(resolved, outline)),
  ...outline.resolved.flatMap((resolved) => readChildCallbackUses(resolved, outline)),
]
