import { linesLabelOf, type CardBlock } from "@flightplan/codegraph"
import type { CardBlockOption } from "./schemas"

const DETAIL_SEPARATOR = " · "
const NAME_SEPARATOR = ", "
const HELD_LABEL = "Already a card"

const childComponentsLabelOf = (names: readonly string[]): string | null =>
  names.length === 0 ? null : `Put the components it renders inside the card: ${names.join(NAME_SEPARATOR)}`

export const toBlockOption = (block: CardBlock, heldCardIds: ReadonlySet<string>): CardBlockOption => ({
  id: block.id,
  name: block.name,
  detail: [block.typeLabel, linesLabelOf(block)].join(DETAIL_SEPARATOR),
  lineStart: block.lineStart,
  lineEnd: block.lineEnd,
  heldLabel: heldCardIds.has(block.id) ? HELD_LABEL : null,
  childComponentsLabel: childComponentsLabelOf(block.childComponentNames),
})
