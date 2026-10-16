import type { CodeBlock, CodeBlockType, JourneyNode } from "@flightplan/configurations"
import { NOTHING_LEFT_OUT, rootBlockOfNode, SAME_NODES } from "./nodes"
import type { CardContext, CardRules, ParentIdById } from "./types"

const CLASS: CodeBlockType = "class"
const METHOD: CodeBlockType = "method"
const PROPERTY: CodeBlockType = "property"
const CONSTRUCTOR_NAMES: ReadonlySet<string> = new Set(["constructor", "__init__"])
const EXTENDED_USE = "value"
const NAME_SEPARATOR = "."

export const isMethodOfClass = (block: CodeBlock): boolean => block.type === METHOD && block.parentBlock?.type === CLASS

const methodNameOf = (method: CodeBlock): string => (method.name ?? "").split(NAME_SEPARATOR).slice(-1)[0]

const isConstructor = (block: CodeBlock): boolean => isMethodOfClass(block) && CONSTRUCTOR_NAMES.has(methodNameOf(block))

export const classOfDeclaredProperty = (block: CodeBlock): CodeBlock | null => {
  const method = block.type === PROPERTY ? block.parentBlock : null
  return method !== null && isConstructor(method) ? method.parentBlock : null
}

export const hasMethodsOfItsOwn = (block: CodeBlock): boolean => block.childrenBlocks.some((child) => child.type === METHOD && (child.cardOwner ?? null) === null)

export const extendedClassOf = (block: CodeBlock): CodeBlock | null => {
  const extended = block.outerSymbols.find((symbol) =>
    symbol.use === EXTENDED_USE
    && (symbol.type === "internal-code-block" || symbol.type === "external-block")
    && symbol.codeBlockReference.type === CLASS
    && symbol.codeBlockReference.id !== block.id)
  return extended === undefined || (extended.type !== "internal-code-block" && extended.type !== "external-block") ? null : extended.codeBlockReference
}

const isClassNode = (node: JourneyNode): boolean => node.type === CLASS

const listClassAncestorIds = (block: CodeBlock, seenIds: ReadonlySet<string> = new Set()): string[] => {
  const extended = extendedClassOf(block)
  if (extended === null || seenIds.has(extended.id)) return []
  return [extended.id, ...listClassAncestorIds(extended, new Set([...seenIds, extended.id]))]
}

const listClassParents = ({ nodes }: CardContext): ParentIdById => {
  const nodeIds = new Set(nodes.map((node) => node.id))
  const methodParents = nodes.flatMap((node) => {
    const root = rootBlockOfNode(node)
    const holder = root.parentBlock
    return isMethodOfClass(root) && (root.cardOwner ?? null) === null && holder !== null && nodeIds.has(holder.id) ? [[node.id, holder.id] as const] : []
  })
  const classParents = nodes.filter(isClassNode).flatMap((node) => {
    const extended = extendedClassOf(rootBlockOfNode(node))
    return extended !== null && nodeIds.has(extended.id) ? [[node.id, extended.id] as const] : []
  })
  return new Map([...methodParents, ...classParents])
}

const listOverriddenMethodIds = (nodes: readonly JourneyNode[]): string[] => {
  const methods = nodes.map(rootBlockOfNode).filter(isMethodOfClass)
  const isWrittenAgainBelow = (method: CodeBlock): boolean =>
    methods.some((other) => {
      const holder = other.parentBlock
      return other.id !== method.id
        && methodNameOf(other) === methodNameOf(method)
        && holder !== null
        && method.parentBlock !== null
        && listClassAncestorIds(holder).includes(method.parentBlock.id)
    })
  return methods.filter(isWrittenAgainBelow).map((method) => method.id)
}

const listDeclaringOnlyConstructorIds = ({ nodes, edges }: CardContext): string[] => {
  const leavingIds = new Set(edges.map((edge) => edge.from))
  return nodes.filter((node) => isConstructor(rootBlockOfNode(node)) && node.codeBlocks.length === 1 && !leavingIds.has(node.id)).map((node) => node.id)
}

const listLeftOutMethodIds = (context: CardContext): ReadonlySet<string> => {
  const leftOutIds = [...listOverriddenMethodIds(context.nodes), ...listDeclaringOnlyConstructorIds(context)]
  return leftOutIds.length === 0 ? NOTHING_LEFT_OUT : new Set(leftOutIds)
}

export const classCard: CardRules = {
  ...SAME_NODES,
  kind: "class",
  isNodeBlock: isMethodOfClass,
  listParents: listClassParents,
  listLeftOutNodeIds: listLeftOutMethodIds,
}
