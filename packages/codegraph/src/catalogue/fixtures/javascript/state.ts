import type { PatternFixture } from "@/catalogue/types"

const EFFECTOR = "Effector"

export const effectorFixtures: readonly PatternFixture[] = [
  {
    library: EFFECTOR,
    patternKey: "factory:createStore:*",
    matches: [
      "import { createStore } from \"effector\"\nconst $todos = createStore([])",
    ],
    rejects: [
      "const createStore = (...parts) => parts\nconst $todos = createStore([])",
    ],
  },
  {
    library: EFFECTOR,
    patternKey: "factory:createStore:*>call:on:*",
    matches: [
      "import { createStore } from \"effector\"\nconst $todos = createStore([])\n$todos.on(added, (todos, todo) => [...todos, todo])",
    ],
    rejects: [
      "const None = makeLocalRegistry()\n$todos.on(added, (todos, todo) => [...todos, todo])",
    ],
  },
  {
    library: EFFECTOR,
    patternKey: "factory:createEvent:*",
    matches: [
      "import { createEvent } from \"effector\"\nconst submit = createEvent()",
    ],
    rejects: [
      "const createEvent = (...parts) => parts\nconst submit = createEvent()",
    ],
  },
  {
    library: EFFECTOR,
    patternKey: "factory:createEvent:*>call:watch:*",
    matches: [
      "import { createEvent } from \"effector\"\nconst submit = createEvent()\nsubmit.watch((todo) => report(todo))",
    ],
    rejects: [
      "const submit = makeLocalRegistry()\nsubmit.watch((todo) => report(todo))",
    ],
  },
  {
    library: EFFECTOR,
    patternKey: "factory:createEvent:*>called",
    matches: [
      "import { createEvent } from \"effector\"\nconst submit = createEvent()\nsubmit(\"Buy milk\")",
    ],
    rejects: [
      "const submit = makeLocalRegistry()\nsubmit(\"Buy milk\")",
    ],
  },
  {
    library: EFFECTOR,
    patternKey: "call:createEffect:*",
    matches: [
      "import { createEffect } from \"effector\"\nconst saveTodoFx = createEffect(async (todo) => saveTodo(todo))",
    ],
    rejects: [
      "const createEffect = (...parts) => parts\nconst saveTodoFx = createEffect(async (todo) => saveTodo(todo))",
    ],
  },
  {
    library: EFFECTOR,
    patternKey: "call:sample:*",
    matches: [
      "import { sample } from \"effector\"\nsample({ clock: submit, source: $todo, target: added })",
    ],
    rejects: [
      "const sample = (...parts) => parts\nsample({ clock: submit, source: $todo, target: added })",
    ],
  },
  {
    library: EFFECTOR,
    patternKey: "call:useUnit:*",
    matches: [
      "import { useUnit } from \"effector-react\"\nconst [todos, add] = useUnit([$todos, added])",
    ],
    rejects: [
      "const useUnit = (...parts) => parts\nconst [todos, add] = useUnit([$todos, added])",
    ],
  },
]

const JOTAI = "Jotai"

export const jotaiFixtures: readonly PatternFixture[] = [
  {
    library: JOTAI,
    patternKey: "call:atom:*",
    matches: [
      "import { atom } from \"jotai\"\nconst countAtom = atom(0)",
      "import { atom } from \"jotai\"\nconst doubledAtom = atom((get) => get(countAtom) * 2)",
    ],
    rejects: [
      "const atom = (...parts) => parts\nconst countAtom = atom(0)",
    ],
  },
  {
    library: JOTAI,
    patternKey: "call:useAtom:*",
    matches: [
      "import { useAtom } from \"jotai\"\nconst [count, setCount] = useAtom(countAtom)",
    ],
    rejects: [
      "const useAtom = (...parts) => parts\nconst [count, setCount] = useAtom(countAtom)",
    ],
  },
  {
    library: JOTAI,
    patternKey: "call:atomWithStorage:*",
    matches: [
      "import { atomWithStorage } from \"jotai/utils\"\nconst darkModeAtom = atomWithStorage(\"darkMode\", false)",
    ],
    rejects: [
      "const atomWithStorage = (...parts) => parts\nconst darkModeAtom = atomWithStorage(\"darkMode\", false)",
    ],
  },
]

const MOBX = "MobX"

export const mobxFixtures: readonly PatternFixture[] = [
  {
    library: MOBX,
    patternKey: "call:makeObservable:*",
    matches: [
      "import { makeObservable } from \"mobx\"\nclass Todo { constructor() { makeObservable(this, { finished: observable, toggle: action }) } }",
    ],
    rejects: [
      "const makeObservable = (...parts) => parts\nclass Todo { constructor() { makeObservable(this, { finished: observable, toggle: action }) } }",
    ],
  },
  {
    library: MOBX,
    patternKey: "call:makeAutoObservable:*",
    matches: [
      "import { makeAutoObservable } from \"mobx\"\nclass Timer { secondsPassed = 0; constructor() { makeAutoObservable(this) } }",
    ],
    rejects: [
      "const makeAutoObservable = (...parts) => parts\nclass Timer { secondsPassed = 0; constructor() { makeAutoObservable(this) } }",
    ],
  },
  {
    library: MOBX,
    patternKey: "call:observable:*",
    matches: [
      "import { observable } from \"mobx\"\nconst todos = observable([])",
    ],
    rejects: [
      "const observable = (...parts) => parts\nconst todos = observable([])",
    ],
  },
  {
    library: MOBX,
    patternKey: "call:autorun:*",
    matches: [
      "import { autorun } from \"mobx\"\nautorun(() => { report(timer.secondsPassed) })",
    ],
    rejects: [
      "const autorun = (...parts) => parts\nautorun(() => { report(timer.secondsPassed) })",
    ],
  },
  {
    library: MOBX,
    patternKey: "call:observer:*",
    matches: [
      "import { observer } from \"mobx-react-lite\"\nconst TimerView = observer(({ timer }) => <span>{timer.secondsPassed}</span>)",
    ],
    rejects: [
      "const observer = (...parts) => parts\nconst TimerView = observer(({ timer }) => <span>{timer.secondsPassed}</span>)",
    ],
  },
]

const NANOSTORES = "Nano Stores"

export const nanostoresFixtures: readonly PatternFixture[] = [
  {
    library: NANOSTORES,
    patternKey: "factory:atom:*",
    matches: [
      "import { atom } from \"nanostores\"\nconst $counter = atom(0)",
    ],
    rejects: [
      "const atom = (...parts) => parts\nconst $counter = atom(0)",
    ],
  },
  {
    library: NANOSTORES,
    patternKey: "factory:atom:*>call:get:*",
    matches: [
      "import { atom } from \"nanostores\"\nconst $counter = atom(0)\nconst count = $counter.get()",
    ],
    rejects: [
      "const None = makeLocalRegistry()\nconst count = $counter.get()",
    ],
  },
  {
    library: NANOSTORES,
    patternKey: "factory:atom:*>call:set:*",
    matches: [
      "import { atom } from \"nanostores\"\nconst $counter = atom(0)\n$counter.set($counter.get() + 1)",
    ],
    rejects: [
      "const None = makeLocalRegistry()\n$counter.set($counter.get() + 1)",
    ],
  },
  {
    library: NANOSTORES,
    patternKey: "factory:atom:*>call:subscribe:*",
    matches: [
      "import { atom } from \"nanostores\"\nconst $counter = atom(0)\n$counter.subscribe((value) => report(value))",
    ],
    rejects: [
      "const None = makeLocalRegistry()\n$counter.subscribe((value) => report(value))",
    ],
  },
  {
    library: NANOSTORES,
    patternKey: "call:computed:*",
    matches: [
      "import { computed } from \"nanostores\"\nconst $admins = computed($users, (users) => users.filter((user) => user.isAdmin))",
    ],
    rejects: [
      "const computed = (...parts) => parts\nconst $admins = computed($users, (users) => users.filter((user) => user.isAdmin))",
    ],
  },
  {
    library: NANOSTORES,
    patternKey: "call:onMount:*",
    matches: [
      "import { onMount } from \"nanostores\"\nonMount($profile, () => { loadProfile() })",
    ],
    rejects: [
      "const onMount = (...parts) => parts\nonMount($profile, () => { loadProfile() })",
    ],
  },
  {
    library: NANOSTORES,
    patternKey: "call:useStore:*",
    matches: [
      "import { useStore } from \"@nanostores/react\"\nconst profile = useStore($profile)",
    ],
    rejects: [
      "const useStore = (...parts) => parts\nconst profile = useStore($profile)",
    ],
  },
]

const TINYBASE = "TinyBase"

export const tinybaseFixtures: readonly PatternFixture[] = [
  {
    library: TINYBASE,
    patternKey: "factory:createStore:*",
    matches: [
      "import { createStore } from \"tinybase\"\nconst store = createStore()",
    ],
    rejects: [
      "const createStore = (...parts) => parts\nconst store = createStore()",
    ],
  },
  {
    library: TINYBASE,
    patternKey: "factory:createStore:*>call:setCell:*",
    matches: [
      "import { createStore } from \"tinybase\"\nconst store = createStore()\nstore.setCell(\"pets\", \"fido\", \"species\", \"dog\")",
    ],
    rejects: [
      "const store = makeLocalRegistry()\nstore.setCell(\"pets\", \"fido\", \"species\", \"dog\")",
    ],
  },
  {
    library: TINYBASE,
    patternKey: "factory:createStore:*>call:getCell:*",
    matches: [
      "import { createStore } from \"tinybase\"\nconst store = createStore()\nconst species = store.getCell(\"pets\", \"fido\", \"species\")",
    ],
    rejects: [
      "const store = makeLocalRegistry()\nconst species = store.getCell(\"pets\", \"fido\", \"species\")",
    ],
  },
  {
    library: TINYBASE,
    patternKey: "factory:createStore:*>call:setRow:*",
    matches: [
      "import { createStore } from \"tinybase\"\nconst store = createStore()\nstore.setRow(\"pets\", \"fido\", { species: \"dog\" })",
    ],
    rejects: [
      "const store = makeLocalRegistry()\nstore.setRow(\"pets\", \"fido\", { species: \"dog\" })",
    ],
  },
  {
    library: TINYBASE,
    patternKey: "factory:createStore:*>call:getRow:*",
    matches: [
      "import { createStore } from \"tinybase\"\nconst store = createStore()\nconst pet = store.getRow(\"pets\", \"fido\")",
    ],
    rejects: [
      "const store = makeLocalRegistry()\nconst pet = store.getRow(\"pets\", \"fido\")",
    ],
  },
  {
    library: TINYBASE,
    patternKey: "factory:createStore:*>call:setTable:*",
    matches: [
      "import { createStore } from \"tinybase\"\nconst store = createStore()\nstore.setTable(\"pets\", { fido: { species: \"dog\" } })",
    ],
    rejects: [
      "const store = makeLocalRegistry()\nstore.setTable(\"pets\", { fido: { species: \"dog\" } })",
    ],
  },
  {
    library: TINYBASE,
    patternKey: "factory:createStore:*>call:addTableListener:*",
    matches: [
      "import { createStore } from \"tinybase\"\nconst store = createStore()\nstore.addTableListener(\"pets\", () => report(store.getTable(\"pets\")))",
    ],
    rejects: [
      "const store = makeLocalRegistry()\nstore.addTableListener(\"pets\", () => report(store.getTable(\"pets\")))",
    ],
  },
  {
    library: TINYBASE,
    patternKey: "call:useCell:*",
    matches: [
      "import { useCell } from \"tinybase/ui-react\"\nconst species = useCell(\"pets\", \"fido\", \"species\")",
    ],
    rejects: [
      "const useCell = (...parts) => parts\nconst species = useCell(\"pets\", \"fido\", \"species\")",
    ],
  },
]

const VALTIO = "Valtio"

export const valtioFixtures: readonly PatternFixture[] = [
  {
    library: VALTIO,
    patternKey: "call:proxy:*",
    matches: [
      "import { proxy } from \"valtio\"\nconst state = proxy({ count: 0, text: \"hello\" })",
    ],
    rejects: [
      "const proxy = (...parts) => parts\nconst state = proxy({ count: 0, text: \"hello\" })",
    ],
  },
  {
    library: VALTIO,
    patternKey: "call:useSnapshot:*",
    matches: [
      "import { useSnapshot } from \"valtio\"\nconst snap = useSnapshot(state)",
    ],
    rejects: [
      "const useSnapshot = (...parts) => parts\nconst snap = useSnapshot(state)",
    ],
  },
  {
    library: VALTIO,
    patternKey: "call:snapshot:*",
    matches: [
      "import { snapshot } from \"valtio\"\nconst snap = snapshot(state)",
    ],
    rejects: [
      "const snapshot = (...parts) => parts\nconst snap = snapshot(state)",
    ],
  },
  {
    library: VALTIO,
    patternKey: "call:subscribe:*",
    matches: [
      "import { subscribe } from \"valtio\"\nconst unsubscribe = subscribe(state, () => report(state.count))",
    ],
    rejects: [
      "const subscribe = (...parts) => parts\nconst unsubscribe = subscribe(state, () => report(state.count))",
    ],
  },
  {
    library: VALTIO,
    patternKey: "call:subscribeKey:*",
    matches: [
      "import { subscribeKey } from \"valtio/utils\"\nsubscribeKey(state, \"count\", (count) => report(count))",
    ],
    rejects: [
      "const subscribeKey = (...parts) => parts\nsubscribeKey(state, \"count\", (count) => report(count))",
    ],
  },
]

const XSTATE = "XState"

export const xstateFixtures: readonly PatternFixture[] = [
  {
    library: XSTATE,
    patternKey: "call:createMachine:*",
    matches: [
      "import { createMachine } from \"xstate\"\nconst toggleMachine = createMachine({ id: \"toggle\", initial: \"inactive\", states: { inactive: {}, active: {} } })",
    ],
    rejects: [
      "const createMachine = (...parts) => parts\nconst toggleMachine = createMachine({ id: \"toggle\", initial: \"inactive\", states: { inactive: {}, active: {} } })",
    ],
  },
  {
    library: XSTATE,
    patternKey: "factory:createActor:*",
    matches: [
      "import { createActor } from \"xstate\"\nconst actor = createActor(toggleMachine)",
    ],
    rejects: [
      "const createActor = (...parts) => parts\nconst actor = createActor(toggleMachine)",
    ],
  },
  {
    library: XSTATE,
    patternKey: "factory:createActor:*>call:subscribe:*",
    matches: [
      "import { createActor } from \"xstate\"\nconst actor = createActor(toggleMachine)\nactor.subscribe((snapshot) => { report(snapshot.value) })",
    ],
    rejects: [
      "const actor = makeLocalRegistry()\nactor.subscribe((snapshot) => { report(snapshot.value) })",
    ],
  },
  {
    library: XSTATE,
    patternKey: "factory:createActor:*>call:send:*",
    matches: [
      "import { createActor } from \"xstate\"\nconst actor = createActor(toggleMachine)\nactor.send({ type: \"toggle\" })",
    ],
    rejects: [
      "const actor = makeLocalRegistry()\nactor.send({ type: \"toggle\" })",
    ],
  },
  {
    library: XSTATE,
    patternKey: "call:fromPromise:*",
    matches: [
      "import { fromPromise } from \"xstate\"\nconst fetchUser = fromPromise(async ({ input }) => loadUser(input.userId))",
    ],
    rejects: [
      "const fromPromise = (...parts) => parts\nconst fetchUser = fromPromise(async ({ input }) => loadUser(input.userId))",
    ],
  },
  {
    library: XSTATE,
    patternKey: "call:assign:*",
    matches: [
      "import { assign } from \"xstate\"\nconst increment = assign({ count: ({ context }) => context.count + 1 })",
    ],
    rejects: [
      "const assign = (...parts) => parts\nconst increment = assign({ count: ({ context }) => context.count + 1 })",
    ],
  },
  {
    library: XSTATE,
    patternKey: "call:useMachine:*",
    matches: [
      "import { useMachine } from \"@xstate/react\"\nconst [snapshot, send] = useMachine(toggleMachine)",
    ],
    rejects: [
      "const useMachine = (...parts) => parts\nconst [snapshot, send] = useMachine(toggleMachine)",
    ],
  },
  {
    library: XSTATE,
    patternKey: "call:useSelector:*",
    matches: [
      "import { useSelector } from \"@xstate/react\"\nconst count = useSelector(actorRef, (snapshot) => snapshot.context.count)",
    ],
    rejects: [
      "const useSelector = (...parts) => parts\nconst count = useSelector(actorRef, (snapshot) => snapshot.context.count)",
    ],
  },
]
