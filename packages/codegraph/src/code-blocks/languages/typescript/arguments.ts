import { bindingNamesIn } from "@/ast-graph/languages/typescript/patterns"
import { isFieldOf } from "@/ast-graph/languages/typescript/syntax"
import type { SyntaxNode } from "@/ast-graph/parser"
import { isSameRange, rangeOf } from "@/ast-graph/source-range"
import type { ReadBlock } from "@/code-blocks/reading"
import { compareRanges, rangeOfNode } from "@/code-blocks/source-range"
import { groupBy } from "@/shared/group-by"
import type { FileOutline } from "./outline"
import { blockIdOf, nodeAtRange, startOf } from "./syntax"

export interface ArgumentOwner {
  readonly filePath: string
  readonly outline: FileOutline
  readonly ownerId: string
}

const ARGUMENT = "root-argument-value"
const NAME_TYPE = "identifier"
const OBJECT_PATTERN_TYPE = "object_pattern"
const MEMBER_TYPE = "member_expression"
const RECEIVER_NAME = "this"
const NOTHING_TAKEN: readonly string[] = []

export const listParameters = (callable: SyntaxNode): SyntaxNode[] => {
  const bare = callable.childForFieldName("parameter")
  return bare === null ? (callable.childForFieldName("parameters")?.namedChildren ?? []) : [bare]
}

export const patternOf = (parameter: SyntaxNode): SyntaxNode | null =>
  parameter.type === NAME_TYPE ? parameter : parameter.childForFieldName("pattern")

const keyOf = (property: SyntaxNode): string => {
  const key = property.childForFieldName("key") ?? property.childForFieldName("left")
  const names = bindingNamesIn(property)
  return key?.text ?? (names.length === 0 ? property.text : names[0].text)
}

const listMemberReads = (name: SyntaxNode, { outline }: ArgumentOwner): SyntaxNode[] => {
  const declaration = outline.declarations.find((candidate) => isSameRange(candidate.range, rangeOf(name)))
  return outline.resolved
    .filter(({ resolution }) => resolution.kind === "local" && resolution.declaration === declaration)
    .map(({ reference }) => nodeAtRange(outline.tree, reference.range))
    .flatMap((read) => (read.parent?.type === MEMBER_TYPE && isFieldOf(read, "object") ? [read.parent] : []))
}

const readMembers = (name: SyntaxNode, parameterIndex: number, wholeId: string, owner: ArgumentOwner): ReadBlock[] => {
  const readsByMember = groupBy(listMemberReads(name, owner), (read) => read.childForFieldName("property")?.text ?? "")
  return [...readsByMember].map(([member, reads]) => {
    const ranges = reads.map(rangeOfNode).sort(compareRanges)
    return {
      id: blockIdOf(owner.filePath, ARGUMENT, ranges[0], NOTHING_TAKEN),
      name: member,
      type: ARGUMENT,
      ranges,
      parentId: wholeId,
      declaredAt: [],
      argument: { parameterIndex, role: "member" },
    }
  })
}

const readWhole = (parameter: SyntaxNode, name: SyntaxNode, parameterIndex: number, owner: ArgumentOwner): ReadBlock[] => {
  const range = rangeOfNode(parameter)
  const id = blockIdOf(owner.filePath, ARGUMENT, range, NOTHING_TAKEN)
  const whole: ReadBlock = {
    id,
    name: name.text,
    type: ARGUMENT,
    ranges: [range],
    parentId: owner.ownerId,
    declaredAt: [startOf(name)],
    argument: { parameterIndex, role: "whole" },
  }
  return [whole, ...readMembers(name, parameterIndex, id, owner)]
}

const readKey = (binding: SyntaxNode, name: string, parameterIndex: number, owner: ArgumentOwner): ReadBlock => {
  const range = rangeOfNode(binding)
  return {
    id: blockIdOf(owner.filePath, ARGUMENT, range, NOTHING_TAKEN),
    name,
    type: ARGUMENT,
    ranges: [range],
    parentId: owner.ownerId,
    declaredAt: bindingNamesIn(binding).map(startOf),
    argument: { parameterIndex, role: "key" },
  }
}

const readParameter = (parameter: SyntaxNode, parameterIndex: number, owner: ArgumentOwner): ReadBlock[] => {
  const pattern = patternOf(parameter)
  if (pattern === null || pattern.type === RECEIVER_NAME) return []
  if (pattern.type === NAME_TYPE) return readWhole(parameter, pattern, parameterIndex, owner)
  if (pattern.type === OBJECT_PATTERN_TYPE) return pattern.namedChildren.map((property) => readKey(property, keyOf(property), parameterIndex, owner))
  return bindingNamesIn(pattern).map((name) => readKey(name, name.text, parameterIndex, owner))
}

export const readArgumentBlocks = (callable: SyntaxNode, owner: ArgumentOwner): ReadBlock[] =>
  listParameters(callable).flatMap((parameter, parameterIndex) => readParameter(parameter, parameterIndex, owner))
