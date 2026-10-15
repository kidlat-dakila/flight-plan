import type { Node as ProseMirrorNode } from "@tiptap/pm/model"

export interface ContainerKind {
  readonly name: string
  readonly itemName: string
  readonly newItemLabel: string
}

export const TABS_KIND: ContainerKind = { name: "tabs", itemName: "tab", newItemLabel: "New tab" }

export const ACCORDION_KIND: ContainerKind = { name: "accordion", itemName: "section", newItemLabel: "New section" }

type Attributes = Readonly<Record<string, unknown>>

const NO_ATTRIBUTES: Attributes = {}
const SECTION_HEADING_LEVEL = 3

export const childrenOf = (node: ProseMirrorNode): ProseMirrorNode[] =>
  Array.from({ length: node.childCount }, (_, position) => node.child(position))

export const labelOf = (item: ProseMirrorNode): string => (typeof item.attrs.label === "string" ? item.attrs.label : "")

const withChildren = (container: ProseMirrorNode, children: readonly ProseMirrorNode[], containerAttributes: Attributes): ProseMirrorNode =>
  container.type.create({ ...container.attrs, ...containerAttributes }, children)

export const newItemOf = (container: ProseMirrorNode, kind: ContainerKind, itemAttributes: Attributes = NO_ATTRIBUTES): ProseMirrorNode => {
  const { nodes } = container.type.schema
  return nodes[kind.itemName].create({ label: kind.newItemLabel, ...itemAttributes }, nodes.paragraph.create())
}

export const withItemAppended = (container: ProseMirrorNode, item: ProseMirrorNode, containerAttributes: Attributes = NO_ATTRIBUTES): ProseMirrorNode =>
  withChildren(container, [...childrenOf(container), item], containerAttributes)

export const withItemRelabelled = (
  container: ProseMirrorNode,
  index: number,
  label: string,
  itemAttributes: Attributes = NO_ATTRIBUTES,
  containerAttributes: Attributes = NO_ATTRIBUTES,
): ProseMirrorNode => {
  const name = label.trim()
  const children = childrenOf(container).map((item, position) =>
    position === index ? item.type.create({ ...item.attrs, ...itemAttributes, ...(name === "" ? {} : { label: name }) }, item.content) : item,
  )
  return withChildren(container, children, containerAttributes)
}

export const withItemRemoved = (container: ProseMirrorNode, index: number, containerAttributes: Attributes = NO_ATTRIBUTES): ProseMirrorNode | null => {
  const remaining = childrenOf(container).filter((_, position) => position !== index)
  return remaining.length === 0 ? null : withChildren(container, remaining, containerAttributes)
}

export const withItemMoved = (
  container: ProseMirrorNode,
  fromIndex: number,
  toIndex: number,
  containerAttributes: Attributes = NO_ATTRIBUTES,
): ProseMirrorNode => {
  const children = childrenOf(container)
  if (toIndex < 0 || toIndex >= children.length || fromIndex === toIndex) return container
  const others = children.filter((_, position) => position !== fromIndex)
  return withChildren(container, [...others.slice(0, toIndex), children[fromIndex], ...others.slice(toIndex)], containerAttributes)
}

export const headingsOf = (container: ProseMirrorNode): ProseMirrorNode[] => {
  const { schema } = container.type
  return childrenOf(container).flatMap((item) => [
    schema.nodes.heading.create({ level: SECTION_HEADING_LEVEL }, schema.text(labelOf(item))),
    ...childrenOf(item),
  ])
}
