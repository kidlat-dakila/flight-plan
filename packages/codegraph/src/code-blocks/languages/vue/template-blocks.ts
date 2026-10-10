import { handedNameOf, isCondition, isLoop, listAttributes, listChildElements, tagNameOf, type WrittenAttribute } from "@/ast-graph/languages/vue/markup"
import type { SyntaxNode } from "@/ast-graph/parser"
import { blockIdOf } from "@/code-blocks/languages/typescript/syntax"
import type { ReadBlock } from "@/code-blocks/reading"
import { rangeOfNode } from "@/code-blocks/source-range"
import type { CodeBlockType } from "@/code-blocks/types"

interface Holder {
  readonly filePath: string
  readonly parentId: string
  readonly takenIds: readonly string[]
}

const EVENT_NAME_PATTERN = /^on[A-Z]/

const blockAt = (node: SyntaxNode, type: CodeBlockType, name: string | null, { filePath, parentId, takenIds }: Holder): ReadBlock => {
  const range = rangeOfNode(node)
  return { id: blockIdOf(filePath, type, range, takenIds), ...(name === null ? {} : { name }), type, ranges: [range], parentId, declaredAt: [] }
}

const within = (holder: Holder, block: ReadBlock): Holder => ({ ...holder, parentId: block.id, takenIds: [...holder.takenIds, block.id] })

const wrappingTypesOf = (attributes: readonly WrittenAttribute[]): CodeBlockType[] => [
  ...(attributes.some(isLoop) ? ["render-loop" as const] : []),
  ...(attributes.some(isCondition) ? ["render-condition" as const] : []),
]

const readEvents = (attributes: readonly WrittenAttribute[], holder: Holder): ReadBlock[] =>
  attributes.flatMap((attribute) => {
    const name = handedNameOf(attribute)
    return name !== null && EVENT_NAME_PATTERN.test(name) ? [blockAt(attribute.node, "render-event", name, holder)] : []
  })

function readElement(element: SyntaxNode, holder: Holder): ReadBlock[] {
  const attributes = listAttributes(element)
  const wrapping = wrappingTypesOf(attributes).reduce<ReadBlock[]>(
    (blocks, type) => [...blocks, blockAt(element, type, null, blocks.reduce(within, holder))],
    [],
  )
  const around = wrapping.reduce(within, holder)
  const rendered = blockAt(element, "render", tagNameOf(element)?.text ?? null, around)
  const inside = within(around, rendered)
  return [...wrapping, rendered, ...readEvents(attributes, inside), ...listChildElements(element).flatMap((child) => readElement(child, inside))]
}

export const readTemplateBlocks = (template: SyntaxNode, filePath: string, componentId: string): ReadBlock[] => {
  const holder: Holder = { filePath, parentId: componentId, takenIds: [componentId] }
  const root = blockAt(template, "render-root", null, holder)
  return [root, ...listChildElements(template).flatMap((element) => readElement(element, within(holder, root)))]
}
