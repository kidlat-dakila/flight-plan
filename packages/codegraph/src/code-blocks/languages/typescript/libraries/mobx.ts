import type { SyntaxNode } from "@/ast-graph/parser"
import type { PatternMatch } from "@/catalogue/matching/match-sites"
import { blockOfCall, childrenOf, innermostAround } from "@/code-blocks/libraries/read-blocks"
import { storeSeedOf, type StoreSeeding } from "@/code-blocks/libraries/store-cards"
import type { CardReading, CardSeed, Library } from "@/code-blocks/libraries/types"
import type { ReadBlock } from "@/code-blocks/reading"
import type { CodeBlockType } from "@/code-blocks/types"
import { firstOfEach } from "@/shared/first-of-each"
import { memberPartOf, memberSeedsOf, readObjectStore, STORE_HOLDER, type NodeFinder, type StorePart } from "./object-stores"

interface MobxReading {
  readonly blocks: readonly ReadBlock[]
  readonly nodeAt: NodeFinder
}

const MOBX: StoreSeeding = { library: "MobX", kind: "store" }
const MOBX_OBJECT_MAKER = "observable"
const MOBX_ANNOTATING_MAKER = "makeObservable"
const MOBX_INFERRING_MAKER = "makeAutoObservable"
const MOBX_SELF = "this"
const MOBX_CLASS: CodeBlockType = "class"
const MOBX_CONSTRUCTOR = "constructor"
const MOBX_EXCLUDED = "false"
const MOBX_PAIR = "pair"
const MOBX_NAME_SEPARATOR = "."
const MOBX_PART_BY_ANNOTATION: ReadonlyMap<string, StorePart> = new Map<string, StorePart>([
  ["observable", "state"],
  ["computed", "getter"],
  ["action", "action"],
  ["flow", "action"],
])

const argumentsOf = (match: PatternMatch, { nodeAt }: MobxReading): readonly SyntaxNode[] => nodeAt(match.range).childForFieldName("arguments")?.namedChildren ?? []

const annotationsOf = (annotations: SyntaxNode | undefined): ReadonlyMap<string, string> =>
  new Map(
    (annotations?.namedChildren ?? [])
      .filter((pair) => pair.type === MOBX_PAIR)
      .map((pair) => [pair.childForFieldName("key")?.text ?? "", (pair.childForFieldName("value")?.text ?? "").split(MOBX_NAME_SEPARATOR)[0]] as const),
  )

const memberNameOf = (member: ReadBlock): string => (member.name ?? "").split(MOBX_NAME_SEPARATOR).slice(-1)[0]

const annotatedPartOf = (annotations: ReadonlyMap<string, string>) => (member: ReadBlock): StorePart | undefined =>
  MOBX_PART_BY_ANNOTATION.get(annotations.get(memberNameOf(member)) ?? "")

const inferredPartOf = (overrides: ReadonlyMap<string, string>, { nodeAt }: MobxReading) => (member: ReadBlock): StorePart | undefined => {
  const name = memberNameOf(member)
  return name === MOBX_CONSTRUCTOR || overrides.get(name) === MOBX_EXCLUDED ? undefined : memberPartOf(member, nodeAt)
}

const readClassStore = (match: PatternMatch, reading: MobxReading): CardSeed[] => {
  const holder = innermostAround(reading.blocks, match.range, (block) => block.type === MOBX_CLASS)
  if (holder === null) return []
  const annotations = annotationsOf(argumentsOf(match, reading)[1])
  const partOf = match.name === MOBX_ANNOTATING_MAKER ? annotatedPartOf(annotations) : inferredPartOf(annotations, reading)
  return [storeSeedOf(MOBX, holder, STORE_HOLDER), ...memberSeedsOf(MOBX, childrenOf(reading.blocks, holder), partOf)]
}

const MOBX_MAKERS: ReadonlySet<string> = new Set([MOBX_OBJECT_MAKER, MOBX_ANNOTATING_MAKER, MOBX_INFERRING_MAKER])

const readMatch = (match: PatternMatch, reading: MobxReading): CardSeed[] => {
  if (!MOBX_MAKERS.has(match.name)) return []
  if (argumentsOf(match, reading)[0]?.type === MOBX_SELF) return readClassStore(match, reading)
  const call = blockOfCall(reading.blocks, match.range)
  return call === null ? [] : readObjectStore(MOBX, call, reading.blocks, reading.nodeAt)
}

const readMobxCards = ({ matches, blocks, nodeAt }: CardReading): CardSeed[] =>
  firstOfEach(matches.flatMap((match) => readMatch(match, { blocks, nodeAt })), (seed) => seed.blockId)

export const mobxLibrary: Library = {
  name: "MobX",
  specifiers: ["mobx", "mobx-react-lite", "mobx-react"],
  documentedVersion: "7.0",
  category: "state",
  type: "frontend",
  language: "javascript",
  readCards: readMobxCards,
  patterns: [
    { kind: "call", name: "makeObservable", slots: [], makes: "state" },
    { kind: "call", name: "makeAutoObservable", slots: [], makes: "state" },
    { kind: "call", name: "observable", slots: [], makes: "state" },
    { kind: "call", name: "autorun", slots: [{ at: 0, runs: "effect" }] },
    { kind: "call", name: "observer", slots: [{ at: 0, runs: "kept" }] },
  ],
}
