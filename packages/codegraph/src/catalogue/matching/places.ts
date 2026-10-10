import type { SyntaxNode } from "@/ast-graph/parser"
import type { SlotPlace, SlotPosition } from "@/catalogue/types"
import type { PassedValue, SyntaxReader } from "./syntax-reader"

const LAST_ARGUMENT = "last"
const REST_OF_ARGUMENTS = "rest"
const KEY_SEPARATOR = "."
const EACH_ITEM = "[]"
const EVERY_KEY = "*"
const POSITION_PATTERN = /^\d+$/

interface PlaceStep {
  readonly key: string
  readonly isEachItem: boolean
}

export interface ItemHolder {
  readonly kind: "item"
  readonly node: SyntaxNode
}

export interface PropertyHolder {
  readonly kind: "property"
  readonly name: string
}

export type PlaceHolder = ItemHolder | PropertyHolder

export interface PlacedNode {
  readonly node: SyntaxNode
  readonly holders: readonly PlaceHolder[]
}

const stepsOf = (place: string): PlaceStep[] =>
  place.split(KEY_SEPARATOR).map((step) => (step.endsWith(EACH_ITEM) ? { key: step.slice(0, -EACH_ITEM.length), isEachItem: true } : { key: step, isEachItem: false }))

export const lastKeyOf = (position: SlotPosition): string | null => {
  if (typeof position !== "string") return null
  const steps = stepsOf(position)
  return steps[steps.length - 1].key
}

export const listPositional = (passed: readonly PassedValue[]): SyntaxNode[] => passed.filter((value) => value.position !== null).map((value) => value.node)

const unheld = (node: SyntaxNode): PlacedNode => ({ node, holders: [] })

const propertiesNamed = ({ node, holders }: PlacedNode, key: string, reader: SyntaxReader): PlacedNode[] =>
  (reader.propertiesOf(node) ?? [])
    .filter((property) => key === EVERY_KEY || property.name === key)
    .map((property) => ({ node: property.node, holders: key === EVERY_KEY ? [...holders, { kind: "property", name: property.name ?? "" }] : holders }))

const spread = (placed: readonly PlacedNode[], isEachItem: boolean, reader: SyntaxReader): PlacedNode[] =>
  isEachItem
    ? placed.flatMap(({ node, holders }) => (reader.itemsOf(node) ?? []).map((item) => ({ node: item, holders: [...holders, { kind: "item" as const, node: item }] })))
    : [...placed]

const startingAt = (key: string, passed: readonly PassedValue[], reader: SyntaxReader): PlacedNode[] => {
  const positional = listPositional(passed).map(unheld)
  if (POSITION_PATTERN.test(key)) return positional.slice(Number(key), Number(key) + 1)
  const named = passed.filter((value) => value.name === key).map((value) => unheld(value.node))
  return named.length > 0 ? named : positional.flatMap((argument) => propertiesNamed(argument, key, reader))
}

const placedAtKeyPath = (place: string, passed: readonly PassedValue[], reader: SyntaxReader): PlacedNode[] => {
  const [first, ...deeper] = stepsOf(place)
  return deeper.reduce<PlacedNode[]>(
    (holders, step) => spread(holders.flatMap((holder) => propertiesNamed(holder, step.key, reader)), step.isEachItem, reader),
    spread(startingAt(first.key, passed, reader), first.isEachItem, reader),
  )
}

const placedAtPlace = (place: SlotPlace, passed: readonly PassedValue[], reader: SyntaxReader): PlacedNode[] => {
  const positional = listPositional(passed).map(unheld)
  if (typeof place === "number") return positional.slice(place, place + 1)
  if (place === LAST_ARGUMENT) return positional.slice(-1)
  return place === REST_OF_ARGUMENTS ? [] : placedAtKeyPath(place, passed, reader)
}

const placesOf = (position: SlotPosition): readonly SlotPlace[] => (typeof position === "number" || typeof position === "string" ? [position] : position)

export const isRestOfArguments = (position: SlotPosition): boolean => position === REST_OF_ARGUMENTS

export const placedAt = (position: SlotPosition, passed: readonly PassedValue[], reader: SyntaxReader): PlacedNode[] =>
  placesOf(position)
    .map((place) => placedAtPlace(place, passed, reader))
    .find((placed) => placed.length > 0) ?? []

export const nodesAt = (position: SlotPosition, passed: readonly PassedValue[], reader: SyntaxReader): SyntaxNode[] =>
  placedAt(position, passed, reader).map((placed) => placed.node)
