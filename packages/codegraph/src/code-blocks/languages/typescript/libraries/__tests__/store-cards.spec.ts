import { blockNamed, codeOf, groupOf, type FixtureFiles } from "@/code-blocks/__tests__/group-fixture"
import { cardsOf } from "@/code-blocks/libraries/__tests__/card-fixture"
import type { StoredCodeBlock } from "@/code-blocks/stored-types"

const classificationsOf = (files: FixtureFiles, type: StoredCodeBlock["type"], name: string): readonly string[] =>
  blockNamed(groupOf(files), type, name).classifications

const MOBX_CLASS_STORE: FixtureFiles = {
  "stores/cart.ts": codeOf(
    "import { makeAutoObservable } from \"mobx\"",
    "export class CartStore {",
    "  items = []",
    "  constructor() {",
    "    makeAutoObservable(this, { items: false })",
    "  }",
    "  status = \"idle\"",
    "  get count() { return this.items.length }",
    "  add(product) { this.items.push(product) }",
    "  clear = () => { this.items = [] }",
    "}",
  ),
}

const MOBX_ANNOTATED_STORE: FixtureFiles = {
  "stores/doubler.ts": codeOf(
    "import { makeObservable, observable, computed, action } from \"mobx\"",
    "export class Doubler {",
    "  value = 0",
    "  label = \"doubler\"",
    "  constructor() {",
    "    makeObservable(this, { value: observable, double: computed, increment: action.bound })",
    "  }",
    "  get double() { return this.value * 2 }",
    "  increment() { this.value++ }",
    "}",
  ),
}

const MOBX_OBJECT_STORE: FixtureFiles = {
  "stores/timer.ts": codeOf(
    "import { observable } from \"mobx\"",
    "export const timer = observable({",
    "  seconds: 0,",
    "  get minutes() { return this.seconds / 60 },",
    "  tick() { this.seconds += 1 },",
    "})",
    "export const tags = observable([\"high\", \"low\"])",
  ),
}

describe("the cards MobX writes", () => {
  it("makes a class that calls makeAutoObservable on this the store, its fields its state, its getters its getters and its other methods its actions, leaving out what the overrides exclude", () => {
    expect(cardsOf(MOBX_CLASS_STORE)).toStrictEqual([
      "CartStore: MobX store holder",
      "CartStore.status: MobX store state under STATE",
      "CartStore.count: MobX store getter under GETTERS",
      "CartStore.add: MobX store action under ACTIONS",
      "CartStore.clear: MobX store action under ACTIONS",
    ])
  })

  it("makes only the members makeObservable annotates parts of the store, each by its annotation", () => {
    expect(cardsOf(MOBX_ANNOTATED_STORE)).toStrictEqual([
      "Doubler: MobX store holder",
      "Doubler.value: MobX store state under STATE",
      "Doubler.double: MobX store getter under GETTERS",
      "Doubler.increment: MobX store action under ACTIONS",
    ])
  })

  it("makes the value observable is handed an object the store, and nothing of an observable list", () => {
    expect(cardsOf(MOBX_OBJECT_STORE)).toStrictEqual([
      "timer: MobX store holder",
      "seconds: MobX store state under STATE",
      "minutes: MobX store getter under GETTERS",
      "tick: MobX store action under ACTIONS",
    ])
  })

  it("classifies the holder of each store as a store", () => {
    expect(classificationsOf(MOBX_CLASS_STORE, "class", "CartStore")).toContain("store")
    expect(classificationsOf(MOBX_ANNOTATED_STORE, "class", "Doubler")).toContain("store")
    expect(classificationsOf(MOBX_OBJECT_STORE, "state", "timer")).toContain("store")
  })
})

const VALTIO_STORE: FixtureFiles = {
  "stores/counter.ts": codeOf(
    "import { proxy } from \"valtio\"",
    "export const state = proxy({",
    "  count: 0,",
    "  name: \"foo\",",
    "  inc: () => { ++state.count },",
    "  setName(name) { state.name = name },",
    "})",
  ),
}

describe("the cards Valtio writes", () => {
  it("makes the value of proxy the store, its values its state and its functions its actions", () => {
    expect(cardsOf(VALTIO_STORE)).toStrictEqual([
      "state: Valtio store holder",
      "count: Valtio store state under STATE",
      "name: Valtio store state under STATE",
      "inc: Valtio store action under ACTIONS",
      "setName: Valtio store action under ACTIONS",
    ])
  })

  it("classifies the holder as a store", () => {
    expect(classificationsOf(VALTIO_STORE, "state", "state")).toContain("store")
  })
})

const XSTATE_STORE: FixtureFiles = {
  "stores/counter.ts": codeOf(
    "import { createStore } from \"@xstate/store\"",
    "export const counterStore = createStore({",
    "  context: { count: 0, name: \"counter\" },",
    "  on: {",
    "    inc: (context, event) => ({ ...context, count: context.count + event.by }),",
    "    rename(context, event) { return { ...context, name: event.name } },",
    "  },",
    "})",
  ),
}

describe("the cards XState writes", () => {
  it("makes the value of createStore of @xstate/store the store, each key of its context its state and each transition under on an action", () => {
    expect(cardsOf(XSTATE_STORE)).toStrictEqual([
      "counterStore: XState store holder",
      "count: XState store state under STATE",
      "name: XState store state under STATE",
      "inc: XState store action under ACTIONS",
      "rename: XState store action under ACTIONS",
    ])
  })

  it("classifies the holder as a store", () => {
    expect(classificationsOf(XSTATE_STORE, "state", "counterStore")).toContain("store")
  })
})

const EFFECTOR_STORE: FixtureFiles = {
  "model/counter.ts": codeOf(
    "import { createStore, createEvent } from \"effector\"",
    "export const incremented = createEvent()",
    "export const reset = createEvent()",
    "export const $counter = createStore({ value: 0, step: 1 })",
    "  .on(incremented, (state) => ({ ...state, value: state.value + state.step }))",
    "export const $name = createStore(\"\")",
  ),
  "model/reset.ts": codeOf("import { $name, reset } from \"./counter\"", "$name.on(reset, () => \"\")"),
}

describe("the cards Effector writes", () => {
  it("makes the value of createStore the store, the keys of its initial state its state and each reducer of on a case named after its trigger, in the store it is written on", () => {
    expect(cardsOf(EFFECTOR_STORE)).toStrictEqual([
      "$counter: Effector store holder",
      "value: Effector store state under STATE",
      "step: Effector store state under STATE",
      "incremented: Effector store case under CASES",
      "$name: Effector store holder",
      "reset: Effector store case under CASES in $name",
    ])
  })

  it("classifies the holder as a store", () => {
    expect(classificationsOf(EFFECTOR_STORE, "root-variable", "$counter")).toContain("store")
    expect(classificationsOf(EFFECTOR_STORE, "state", "$name")).toContain("store")
  })
})

const NANOSTORES_STORE: FixtureFiles = {
  "stores/profile.ts": codeOf(
    "import { atom, map } from \"nanostores\"",
    "export const $profile = map({ name: \"anonymous\", email: undefined })",
    "export const $count = atom(0)",
  ),
}

describe("the cards Nano Stores writes", () => {
  it("makes the value of map a store with each key its state, and the value of atom a store of its own", () => {
    expect(cardsOf(NANOSTORES_STORE)).toStrictEqual([
      "$profile: Nano Stores store holder",
      "name: Nano Stores store state under STATE",
      "email: Nano Stores store state under STATE",
      "$count: Nano Stores store holder",
    ])
  })

  it("classifies the holder as a store", () => {
    expect(classificationsOf(NANOSTORES_STORE, "state", "$profile")).toContain("store")
    expect(classificationsOf(NANOSTORES_STORE, "state", "$count")).toContain("store")
  })
})
