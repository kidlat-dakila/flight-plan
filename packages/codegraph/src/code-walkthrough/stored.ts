import type { CodeBlock, FileSection, Waypoint } from "@flightplan/configurations"
import type { LinkedCodeWalkthrough, LinkedFileSection, LinkedWaypoint } from "."

export interface StoredWaypoint extends Omit<Waypoint, "codeBlocks" | "children"> {
  readonly codeBlockIds: readonly string[]
  readonly children: readonly StoredWaypoint[]
}

export interface StoredFileSection extends Omit<FileSection, "waypoints"> {
  readonly waypoints: readonly StoredWaypoint[]
}

export interface StoredLinkedWaypoint extends Omit<LinkedWaypoint, "codeBlocks" | "children"> {
  readonly codeBlockIds: readonly string[]
  readonly children: readonly StoredLinkedWaypoint[]
}

export interface StoredLinkedFileSection extends Omit<LinkedFileSection, "waypoints"> {
  readonly waypoints: readonly StoredLinkedWaypoint[]
}

export interface StoredCodeWalkthrough extends Omit<LinkedCodeWalkthrough, "files"> {
  readonly files: readonly StoredLinkedFileSection[]
}

type BlockById = ReadonlyMap<string, CodeBlock>

const idsOf = (blocks: readonly CodeBlock[]): string[] => blocks.map((block) => block.id)

const found = (blockById: BlockById, blockId: string): CodeBlock => {
  const block = blockById.get(blockId)
  if (block === undefined) throw new Error(`The group holds no block ${blockId}.`)
  return block
}

export const storeWaypoint = ({ codeBlocks, children, ...written }: Waypoint): StoredWaypoint => ({
  ...written,
  codeBlockIds: idsOf(codeBlocks),
  children: children.map(storeWaypoint),
})

export const storeFileSection = (file: FileSection): StoredFileSection => ({ ...file, waypoints: file.waypoints.map(storeWaypoint) })

const storeLinkedWaypoint = ({ codeBlocks, children, ...written }: LinkedWaypoint): StoredLinkedWaypoint => ({
  ...written,
  codeBlockIds: idsOf(codeBlocks),
  children: children.map(storeLinkedWaypoint),
})

export const storeCodeWalkthrough = (walkthrough: LinkedCodeWalkthrough): StoredCodeWalkthrough => ({
  ...walkthrough,
  files: walkthrough.files.map((file) => ({ ...file, waypoints: file.waypoints.map(storeLinkedWaypoint) })),
})

const linkWaypoint = ({ codeBlockIds, children, ...written }: StoredLinkedWaypoint, blockById: BlockById): LinkedWaypoint => ({
  ...written,
  codeBlocks: codeBlockIds.map((blockId) => found(blockById, blockId)),
  children: children.map((child) => linkWaypoint(child, blockById)),
})

export const linkCodeWalkthrough = (stored: StoredCodeWalkthrough, blockById: BlockById): LinkedCodeWalkthrough => ({
  ...stored,
  files: stored.files.map((file) => ({ ...file, waypoints: file.waypoints.map((waypoint) => linkWaypoint(waypoint, blockById)) })),
})
