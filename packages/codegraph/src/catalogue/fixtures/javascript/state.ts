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

const piniaImporting = (code: string): string => `import { defineStore } from "pinia"\n${code}`

const PINIA_OPTIONS_STORE = "export const useCounterStore = defineStore(\"counter\", { state: () => ({ count: 0 }), actions: { increment() { this.count++ } } })"

const PINIA_SETUP_STORE = "export const useCounterStore = defineStore(\"counter\", () => { const count = ref(0); return { count } })"

export const piniaFixtures: readonly PatternFixture[] = [
  {
    library: "Pinia",
    patternKey: "call:defineStore:*",
    matches: [piniaImporting(PINIA_OPTIONS_STORE), piniaImporting(PINIA_SETUP_STORE)],
    rejects: [`const defineStore = (...parts) => parts\n${PINIA_SETUP_STORE}`],
  },
  {
    library: "Pinia",
    patternKey: "factory:defineStore:*",
    matches: [
      "import { defineStore } from \"pinia\"\nexport const useCartStore = defineStore(\"cart\", { state: () => ({ items: [] }) })",
    ],
    rejects: [
      "const defineStore = (...parts) => parts\nexport const useCartStore = defineStore(\"cart\", { state: () => ({ items: [] }) })",
    ],
  },
  {
    library: "Pinia",
    patternKey: "factory:defineStore:*>called",
    matches: [
      "import { defineStore } from \"pinia\"\nexport const useCartStore = defineStore(\"cart\", { state: () => ({ items: [] }) })\nconst cartStore = useCartStore()",
    ],
    rejects: [
      "const useCartStore = makeLocalRegistry()\nconst cartStore = useCartStore()",
    ],
  },
  {
    library: "Pinia",
    patternKey: "factory:defineStore:*>called>call:$subscribe:*",
    matches: [
      "import { defineStore } from \"pinia\"\nexport const useCartStore = defineStore(\"cart\", { state: () => ({ items: [] }) })\nconst cartStore = useCartStore()\ncartStore.$subscribe((mutation, state) => { localStorage.setItem(\"cart\", JSON.stringify(state)) })",
    ],
    rejects: [
      "const cartStore = makeLocalRegistry()\ncartStore.$subscribe((mutation, state) => { localStorage.setItem(\"cart\", JSON.stringify(state)) })",
    ],
  },
  {
    library: "Pinia",
    patternKey: "factory:defineStore:*>called>call:$onAction:*",
    matches: [
      "import { defineStore } from \"pinia\"\nexport const useCartStore = defineStore(\"cart\", { state: () => ({ items: [] }) })\nconst cartStore = useCartStore()\nconst unsubscribe = cartStore.$onAction(({ name, after }) => { after((result) => report(name, result)) })",
    ],
    rejects: [
      "const cartStore = makeLocalRegistry()\nconst unsubscribe = cartStore.$onAction(({ name, after }) => { after((result) => report(name, result)) })",
    ],
  },
]

const REDUX = "Redux"

export const reduxFixtures: readonly PatternFixture[] = [
  {
    library: REDUX,
    patternKey: "factory:configureStore:*",
    matches: [
      "import { configureStore } from \"@reduxjs/toolkit\"\nconst store = configureStore({ reducer: { posts: postsReducer } })",
    ],
    rejects: [
      "const configureStore = (...parts) => parts\nconst store = configureStore({ reducer: { posts: postsReducer } })",
    ],
  },
  {
    library: REDUX,
    patternKey: "factory:configureStore:*>call:dispatch:*",
    matches: [
      "import { configureStore } from \"@reduxjs/toolkit\"\nconst store = configureStore({ reducer: { posts: postsReducer } })\nstore.dispatch(postAdded(post))",
    ],
    rejects: [
      "const store = makeLocalRegistry()\nstore.dispatch(postAdded(post))",
    ],
  },
  {
    library: REDUX,
    patternKey: "factory:configureStore:*>call:getState:*",
    matches: [
      "import { configureStore } from \"@reduxjs/toolkit\"\nconst store = configureStore({ reducer: { posts: postsReducer } })\nconst state = store.getState()",
    ],
    rejects: [
      "const store = makeLocalRegistry()\nconst state = store.getState()",
    ],
  },
  {
    library: REDUX,
    patternKey: "factory:configureStore:*>call:subscribe:*",
    matches: [
      "import { configureStore } from \"@reduxjs/toolkit\"\nconst store = configureStore({ reducer: { posts: postsReducer } })\nstore.subscribe(() => render(store.getState()))",
    ],
    rejects: [
      "const store = makeLocalRegistry()\nstore.subscribe(() => render(store.getState()))",
    ],
  },
  {
    library: REDUX,
    patternKey: "factory:createStore:*",
    matches: [
      "import { createStore } from \"redux\"\nconst store = createStore(rootReducer)",
    ],
    rejects: [
      "const createStore = (...parts) => parts\nconst store = createStore(rootReducer)",
    ],
  },
  {
    library: REDUX,
    patternKey: "factory:createStore:*>call:dispatch:*",
    matches: [
      "import { createStore } from \"redux\"\nconst store = createStore(rootReducer)\nstore.dispatch(postAdded(post))",
    ],
    rejects: [
      "const store = makeLocalRegistry()\nstore.dispatch(postAdded(post))",
    ],
  },
  {
    library: REDUX,
    patternKey: "factory:createStore:*>call:getState:*",
    matches: [
      "import { createStore } from \"redux\"\nconst store = createStore(rootReducer)\nconst state = store.getState()",
    ],
    rejects: [
      "const store = makeLocalRegistry()\nconst state = store.getState()",
    ],
  },
  {
    library: REDUX,
    patternKey: "factory:createStore:*>call:subscribe:*",
    matches: [
      "import { createStore } from \"redux\"\nconst store = createStore(rootReducer)\nstore.subscribe(() => render(store.getState()))",
    ],
    rejects: [
      "const store = makeLocalRegistry()\nstore.subscribe(() => render(store.getState()))",
    ],
  },
  {
    library: REDUX,
    patternKey: "call:createSlice:*",
    matches: [
      "import { createSlice } from \"@reduxjs/toolkit\"\nconst postsSlice = createSlice({ name: \"posts\", initialState, reducers: { postAdded(state, action) { state.items.push(action.payload) } } })",
    ],
    rejects: [
      "const createSlice = (...parts) => parts\nconst postsSlice = createSlice({ name: \"posts\", initialState, reducers: { postAdded(state, action) { state.items.push(action.payload) } } })",
    ],
  },
  {
    library: REDUX,
    patternKey: "call:createAsyncThunk:*",
    matches: [
      "import { createAsyncThunk } from \"@reduxjs/toolkit\"\nconst fetchUserById = createAsyncThunk(\"users/fetchById\", async (userId) => userAPI.fetchById(userId))",
    ],
    rejects: [
      "const createAsyncThunk = (...parts) => parts\nconst fetchUserById = createAsyncThunk(\"users/fetchById\", async (userId) => userAPI.fetchById(userId))",
    ],
  },
  {
    library: REDUX,
    patternKey: "call:createSelector:*",
    matches: [
      "import { createSelector } from \"@reduxjs/toolkit\"\nconst selectVisiblePosts = createSelector([selectPosts, selectFilter], (posts, filter) => posts.filter(filter))",
    ],
    rejects: [
      "const createSelector = (...parts) => parts\nconst selectVisiblePosts = createSelector([selectPosts, selectFilter], (posts, filter) => posts.filter(filter))",
    ],
  },
  {
    library: REDUX,
    patternKey: "factory:createListenerMiddleware:*",
    matches: [
      "import { createListenerMiddleware } from \"@reduxjs/toolkit\"\nconst listenerMiddleware = createListenerMiddleware()",
    ],
    rejects: [
      "const createListenerMiddleware = (...parts) => parts\nconst listenerMiddleware = createListenerMiddleware()",
    ],
  },
  {
    library: REDUX,
    patternKey: "factory:createListenerMiddleware:*>call:startListening:*",
    matches: [
      "import { createListenerMiddleware } from \"@reduxjs/toolkit\"\nconst listenerMiddleware = createListenerMiddleware()\nlistenerMiddleware.startListening({ actionCreator: postAdded, effect: async (action, listenerApi) => { await save(action.payload) } })",
    ],
    rejects: [
      "const listenerMiddleware = makeLocalRegistry()\nlistenerMiddleware.startListening({ actionCreator: postAdded, effect: async (action, listenerApi) => { await save(action.payload) } })",
    ],
  },
  {
    library: REDUX,
    patternKey: "call:useSelector:*",
    matches: [
      "import { useSelector } from \"react-redux\"\nconst posts = useSelector((state) => state.posts.items)",
    ],
    rejects: [
      "const useSelector = (...parts) => parts\nconst posts = useSelector((state) => state.posts.items)",
    ],
  },
  {
    library: REDUX,
    patternKey: "factory:useDispatch:*",
    matches: [
      "import { useDispatch } from \"react-redux\"\nconst dispatch = useDispatch()",
    ],
    rejects: [
      "const useDispatch = (...parts) => parts\nconst dispatch = useDispatch()",
    ],
  },
  {
    library: REDUX,
    patternKey: "factory:useDispatch:*>called",
    matches: [
      "import { useDispatch } from \"react-redux\"\nconst dispatch = useDispatch()\ndispatch(postAdded(post))",
    ],
    rejects: [
      "const dispatch = makeLocalRegistry()\ndispatch(postAdded(post))",
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

const ZUSTAND = "Zustand"

export const zustandFixtures: readonly PatternFixture[] = [
  {
    library: ZUSTAND,
    patternKey: "factory:create:*",
    matches: [
      "import { create } from \"zustand\"\nconst useBearStore = create((set) => ({ bears: 0, increase: () => set((state) => ({ bears: state.bears + 1 })) }))",
    ],
    rejects: [
      "const create = (...parts) => parts\nconst useBearStore = create((set) => ({ bears: 0, increase: () => set((state) => ({ bears: state.bears + 1 })) }))",
    ],
  },
  {
    library: ZUSTAND,
    patternKey: "factory:create:*>call:getState:*",
    matches: [
      "import { create } from \"zustand\"\nconst useBearStore = create((set) => ({ bears: 0, increase: () => set((state) => ({ bears: state.bears + 1 })) }))\nconst bears = useBearStore.getState().bears",
    ],
    rejects: [
      "const useBearStore = makeLocalRegistry()\nconst bears = useBearStore.getState().bears",
    ],
  },
  {
    library: ZUSTAND,
    patternKey: "factory:create:*>call:setState:*",
    matches: [
      "import { create } from \"zustand\"\nconst useBearStore = create((set) => ({ bears: 0, increase: () => set((state) => ({ bears: state.bears + 1 })) }))\nuseBearStore.setState({ bears: 0 })",
    ],
    rejects: [
      "const useBearStore = makeLocalRegistry()\nuseBearStore.setState({ bears: 0 })",
    ],
  },
  {
    library: ZUSTAND,
    patternKey: "factory:create:*>call:subscribe:*",
    matches: [
      "import { create } from \"zustand\"\nconst useBearStore = create((set) => ({ bears: 0, increase: () => set((state) => ({ bears: state.bears + 1 })) }))\nuseBearStore.subscribe((state) => report(state.bears))",
    ],
    rejects: [
      "const useBearStore = makeLocalRegistry()\nuseBearStore.subscribe((state) => report(state.bears))",
    ],
  },
  {
    library: ZUSTAND,
    patternKey: "factory:create:*>called",
    matches: [
      "import { create } from \"zustand\"\nconst useBearStore = create((set) => ({ bears: 0, increase: () => set((state) => ({ bears: state.bears + 1 })) }))\nconst bears = useBearStore((state) => state.bears)",
    ],
    rejects: [
      "const useBearStore = makeLocalRegistry()\nconst bears = useBearStore((state) => state.bears)",
    ],
  },
  {
    library: ZUSTAND,
    patternKey: "factory:createStore:*",
    matches: [
      "import { createStore } from \"zustand\"\nconst bearStore = createStore((set) => ({ bears: 0 }))",
    ],
    rejects: [
      "const createStore = (...parts) => parts\nconst bearStore = createStore((set) => ({ bears: 0 }))",
    ],
  },
  {
    library: ZUSTAND,
    patternKey: "factory:createStore:*>call:getState:*",
    matches: [
      "import { createStore } from \"zustand\"\nconst bearStore = createStore((set) => ({ bears: 0 }))\nconst bears = bearStore.getState().bears",
    ],
    rejects: [
      "const bearStore = makeLocalRegistry()\nconst bears = bearStore.getState().bears",
    ],
  },
  {
    library: ZUSTAND,
    patternKey: "factory:createStore:*>call:setState:*",
    matches: [
      "import { createStore } from \"zustand\"\nconst bearStore = createStore((set) => ({ bears: 0 }))\nbearStore.setState({ bears: 0 })",
    ],
    rejects: [
      "const bearStore = makeLocalRegistry()\nbearStore.setState({ bears: 0 })",
    ],
  },
  {
    library: ZUSTAND,
    patternKey: "factory:createStore:*>call:subscribe:*",
    matches: [
      "import { createStore } from \"zustand\"\nconst bearStore = createStore((set) => ({ bears: 0 }))\nbearStore.subscribe((state) => report(state.bears))",
    ],
    rejects: [
      "const bearStore = makeLocalRegistry()\nbearStore.subscribe((state) => report(state.bears))",
    ],
  },
  {
    library: ZUSTAND,
    patternKey: "call:useStore:*",
    matches: [
      "import { useStore } from \"zustand\"\nconst bears = useStore(bearStore, (state) => state.bears)",
    ],
    rejects: [
      "const useStore = (...parts) => parts\nconst bears = useStore(bearStore, (state) => state.bears)",
    ],
  },
  {
    library: ZUSTAND,
    patternKey: "call:persist:*",
    matches: [
      "import { persist } from \"zustand/middleware\"\nconst usePositionStore = create(persist((set) => ({ position: { x: 0, y: 0 } }), { name: \"position-storage\" }))",
    ],
    rejects: [
      "const persist = (...parts) => parts\nconst usePositionStore = create(persist((set) => ({ position: { x: 0, y: 0 } }), { name: \"position-storage\" }))",
    ],
  },
]
