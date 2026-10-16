import type { SyntaxNode } from "@/ast-graph/parser"
import type { PatternMatch } from "@/catalogue/matching/match-sites"
import { blockOfCall, childrenOf, descendantsOf, parentOf, rootOf } from "@/code-blocks/libraries/read-blocks"
import { partSeedOf, storeSeedOf, unquotedTextOf, type PartSeed, type StoreSeeding } from "@/code-blocks/libraries/store-cards"
import type { CardReading, CardSeed, Library } from "@/code-blocks/libraries/types"
import type { ReadBlock } from "@/code-blocks/reading"
import type { CodeBlockType, SourceRange } from "@/code-blocks/types"
import { firstOfEach } from "@/shared/first-of-each"

interface ReduxReading {
  readonly blocks: readonly ReadBlock[]
  readonly nodeAt: (range: SourceRange) => SyntaxNode
}

const REDUX: StoreSeeding = { library: "Redux", kind: "store" }
const REDUX_PROPERTY: CodeBlockType = "property"
const REDUX_CALLBACK: CodeBlockType = "effect-callback"
const REDUX_EFFECT: CodeBlockType = "effect"
const REDUX_EVENT: CodeBlockType = "code-event"
const REDUX_SLICE_NAME = "name"
const REDUX_INITIAL_STATE = "initialState"
const REDUX_REDUCERS = "reducers"
const REDUX_EXTRA_REDUCERS = "extraReducers"
const REDUX_ACTION_CREATOR = "actionCreator"
const REDUX_LISTENER_SUFFIX = " listener"
const REDUX_MEMBER_SEPARATOR = "."
const REDUX_HOLDER: PartSeed = { part: "holder", heading: null }
const REDUX_ROOT_PART_BY_CALL: ReadonlyMap<string, "thunk" | "selector"> = new Map([
  ["createAsyncThunk", "thunk"],
  ["createSelector", "selector"],
  ["getSelectors", "selector"],
])

const valueOfOption = (option: ReadBlock, { nodeAt }: ReduxReading): SyntaxNode | null => nodeAt(option.ranges[0]).childForFieldName("value")

const firstArgumentTextOf = (call: ReadBlock, { nodeAt }: ReduxReading): string | null =>
  nodeAt(call.ranges[0]).childForFieldName("arguments")?.firstNamedChild?.text ?? null

const optionNamed = (definer: ReadBlock, name: string, { blocks }: ReduxReading): ReadBlock | undefined =>
  childrenOf(blocks, definer).find((option) => option.name === name)

const REDUX_CALL_NODE = "call_expression"
const REDUX_CALLED = "()"

const madeStateOf = (initialState: ReadBlock, reading: ReduxReading): string | null => {
  const value = valueOfOption(initialState, reading)
  const callee = value?.type === REDUX_CALL_NODE ? value.childForFieldName("function") : null
  return callee === null ? null : `${callee.text}${REDUX_CALLED}`
}

const readStateKeys = (initialState: ReadBlock, reading: ReduxReading): CardSeed[] => {
  const keys = childrenOf(reading.blocks, initialState).filter((key) => key.type === REDUX_PROPERTY).map((key) => storeSeedOf(REDUX, key, partSeedOf("state")))
  const made = madeStateOf(initialState, reading)
  if (made !== null) return [storeSeedOf(REDUX, initialState, partSeedOf("state", made)), ...keys]
  return keys.length === 0 ? [storeSeedOf(REDUX, initialState, partSeedOf("state"))] : keys
}

const readCases = (builder: ReadBlock, part: "extra-reducer" | "case", reading: ReduxReading): CardSeed[] =>
  descendantsOf(reading.blocks, builder).flatMap((handled) => {
    const call = handled.type === REDUX_CALLBACK ? parentOf(reading.blocks, handled) : null
    return call?.type === REDUX_EFFECT ? [storeSeedOf(REDUX, handled, partSeedOf(part, firstArgumentTextOf(call, reading)))] : []
  })

const readSlice = (definer: ReadBlock, reading: ReduxReading): CardSeed[] => {
  const name = optionNamed(definer, REDUX_SLICE_NAME, reading)
  const initialState = optionNamed(definer, REDUX_INITIAL_STATE, reading)
  const reducers = optionNamed(definer, REDUX_REDUCERS, reading)
  const extraReducers = optionNamed(definer, REDUX_EXTRA_REDUCERS, reading)
  const groupKey = name === undefined ? null : unquotedTextOf(valueOfOption(name, reading))
  return [
    storeSeedOf(REDUX, rootOf(reading.blocks, definer), { ...REDUX_HOLDER, groupKey }),
    ...(initialState === undefined ? [] : readStateKeys(initialState, reading)),
    ...(reducers === undefined ? [] : childrenOf(reading.blocks, reducers).filter((reducer) => reducer.name !== undefined).map((reducer) => storeSeedOf(REDUX, reducer, partSeedOf("reducer")))),
    ...(extraReducers === undefined ? [] : readCases(extraReducers, "extra-reducer", reading)),
  ]
}

const readReducer = (definer: ReadBlock, reading: ReduxReading): CardSeed[] => [
  storeSeedOf(REDUX, rootOf(reading.blocks, definer), REDUX_HOLDER),
  ...childrenOf(reading.blocks, definer).filter((key) => key.type === REDUX_PROPERTY).map((key) => storeSeedOf(REDUX, key, partSeedOf("state"))),
  ...childrenOf(reading.blocks, definer).filter((builder) => builder.type === REDUX_CALLBACK).flatMap((builder) => readCases(builder, "case", reading)),
]

const listenedActionOf = (definer: ReadBlock, reading: ReduxReading): string | null => {
  const actionCreator = optionNamed(definer, REDUX_ACTION_CREATOR, reading)
  const written = actionCreator === undefined ? null : (valueOfOption(actionCreator, reading)?.text ?? null)
  return written === null ? null : `${written.split(REDUX_MEMBER_SEPARATOR).slice(-1)[0]}${REDUX_LISTENER_SUFFIX}`
}

const readListeners = (definer: ReadBlock, reading: ReduxReading): CardSeed[] =>
  childrenOf(reading.blocks, definer).filter((effect) => effect.type === REDUX_EVENT).map((effect) => storeSeedOf(REDUX, effect, partSeedOf("listener", listenedActionOf(definer, reading))))

const REDUX_DEFINERS: ReadonlyMap<string, (definer: ReadBlock, reading: ReduxReading) => CardSeed[]> = new Map([
  ["createSlice", readSlice],
  ["createReducer", readReducer],
  ["startListening", readListeners],
])

const readMatch = (match: PatternMatch, reading: ReduxReading): CardSeed[] => {
  const called = blockOfCall(reading.blocks, match.range)
  if (called === null) return []
  const readDefiner = REDUX_DEFINERS.get(match.name)
  if (readDefiner !== undefined) return readDefiner(called, reading)
  const rootPart = REDUX_ROOT_PART_BY_CALL.get(match.name)
  return rootPart === undefined ? [] : [storeSeedOf(REDUX, rootOf(reading.blocks, called), partSeedOf(rootPart))]
}

const readReduxCards = ({ matches, blocks, nodeAt }: CardReading): CardSeed[] =>
  firstOfEach(matches.flatMap((match) => readMatch(match, { blocks, nodeAt })), (seed) => seed.blockId)

export const reduxLibrary: Library = {
  name: "Redux",
  specifiers: ["redux", "react-redux", "@reduxjs/toolkit"],
  documentedVersion: "5.0",
  category: "state",
  type: "frontend",
  language: "javascript",
  readCards: readReduxCards,
  patterns: [
    {
      kind: "factory",
      name: "configureStore",
      methods: [
        { kind: "call", name: "dispatch", slots: [], makes: "state" },
        { kind: "call", name: "getState", slots: [], makes: "state" },
        { kind: "call", name: "subscribe", slots: [{ at: 0, runs: "event" }] },
      ],
    },
    {
      kind: "factory",
      name: "createStore",
      slots: [{ at: 0, runs: "kept" }],
      methods: [
        { kind: "call", name: "dispatch", slots: [], makes: "state" },
        { kind: "call", name: "getState", slots: [], makes: "state" },
        { kind: "call", name: "subscribe", slots: [{ at: 0, runs: "event" }] },
      ],
    },
    { kind: "call", name: "createSlice", slots: [], makes: "state" },
    { kind: "call", name: "createReducer", slots: [{ at: 1, runs: "in-place" }], makes: "state" },
    {
      kind: "factory",
      name: "createEntityAdapter",
      methods: [
        { kind: "call", name: "getSelectors", slots: [{ at: 0, runs: "in-place" }], makes: "derived" },
      ],
    },
    { kind: "call", name: "createAsyncThunk", slots: [{ at: 1, runs: "kept" }], eventAt: 0 },
    { kind: "call", name: "createSelector", slots: [{ at: "last", runs: "in-place" }], makes: "derived" },
    {
      kind: "factory",
      name: "createListenerMiddleware",
      methods: [
        { kind: "call", name: "startListening", slots: [{ at: "effect", runs: "event" }] },
      ],
    },
    { kind: "call", name: "useSelector", slots: [{ at: 0, runs: "in-place" }], makes: "state" },
    {
      kind: "factory",
      name: "useDispatch",
      methods: [],
      called: {
        slots: [],
        makes: "state",
      },
    },
  ],
}
