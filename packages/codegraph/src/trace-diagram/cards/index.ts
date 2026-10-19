import { PYTHON_CARD_RULES } from "@/journey-flow-diagram/languages/python"
import { TYPESCRIPT_CARD_RULES } from "@/journey-flow-diagram/languages/typescript"
import type { CodeBlock, JourneyNode, JourneyNodeEdge } from "@flightplan/configurations"
import { classCard } from "./class"
import { componentCard } from "./component"
import { returnedFunctionCard } from "./returned-function"
import { routeCard } from "./route"
import { routerCard } from "./router"
import { storeCard } from "./store"
import type { CardContext, CardRules, LibraryCardRules, NodeGroup, ParentIdById } from "./types"

export type { CardContext, CardRules, LibraryCardRules, NodeGroup, ParentIdById } from "./types"

export const CARD_RULES: readonly CardRules[] = [componentCard, classCard, returnedFunctionCard, routeCard, routerCard, storeCard]

export const LIBRARY_CARD_RULES: readonly LibraryCardRules[] = [...TYPESCRIPT_CARD_RULES, ...PYTHON_CARD_RULES]

const RULES_OF_LIBRARIES: readonly Partial<CardRules>[] = LIBRARY_CARD_RULES.map(({ rules }) => rules)

const libraryRulesOf = (block: CodeBlock): Partial<CardRules> | undefined =>
  block.card === undefined ? undefined : LIBRARY_CARD_RULES.find((rules) => rules.library === block.card?.library)?.rules

export const isCardNodeBlock = (block: CodeBlock, isNode: (other: CodeBlock) => boolean): boolean =>
  libraryRulesOf(block)?.isNodeBlock?.(block, isNode) ?? CARD_RULES.some((rules) => rules.isNodeBlock(block, isNode))

export const isCardNotNodeBlock = (block: CodeBlock): boolean =>
  libraryRulesOf(block)?.isNotNodeBlock?.(block) ?? CARD_RULES.some((rules) => rules.isNotNodeBlock(block))

export const listCardParents = (context: CardContext): ParentIdById =>
  [...CARD_RULES, ...RULES_OF_LIBRARIES].reduce<ParentIdById>((parents, rules) => new Map([...(rules.listParents?.(context) ?? []), ...parents]), new Map())

export const listLeftOutNodeIds = (context: CardContext): ReadonlySet<string> =>
  new Set([...CARD_RULES, ...RULES_OF_LIBRARIES].flatMap((rules) => [...(rules.listLeftOutNodeIds?.(context) ?? [])]))

export const groupCardNodes = (nodes: readonly JourneyNode[]): NodeGroup[] =>
  [...CARD_RULES, ...RULES_OF_LIBRARIES].flatMap((rules) => rules.groupNodes?.(nodes) ?? [])

export const listCardAddedEdges = (context: CardContext): JourneyNodeEdge[] =>
  [...CARD_RULES, ...RULES_OF_LIBRARIES].flatMap((rules) => rules.listAddedEdges?.(context) ?? [])

export const listCardLeftOutEdgeIds = (context: CardContext): ReadonlySet<string> =>
  new Set([...CARD_RULES, ...RULES_OF_LIBRARIES].flatMap((rules) => [...(rules.listLeftOutEdgeIds?.(context) ?? [])]))
