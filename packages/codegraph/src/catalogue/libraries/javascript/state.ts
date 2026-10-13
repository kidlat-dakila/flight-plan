import type { CatalogueLibrary, Slot } from "@/catalogue/types"

const FIRST_ARGUMENT = 0

const SECOND_ARGUMENT = 1

const THIRD_ARGUMENT = 2

export const effectorLibrary: CatalogueLibrary = {
  name: "Effector",
  specifiers: ["effector", "effector-react", "effector-vue"],
  documentedVersion: "23.4",
  category: "state",
  type: "frontend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "createStore",
      makes: "state",
      methods: [
        { kind: "call", name: "on", slots: [{ at: 1, runs: "event" }] },
      ],
    },
    {
      kind: "factory",
      name: "createEvent",
      methods: [
        { kind: "call", name: "watch", slots: [{ at: 0, runs: "event" }] },
      ],
      called: {
        slots: [],
        makes: "publish",
      },
    },
    { kind: "call", name: "createEffect", slots: [{ at: 0, runs: "kept" }] },
    { kind: "call", name: "sample", slots: [], makes: "publish" },
    { kind: "call", name: "useUnit", slots: [], makes: "state" },
  ],
}

export const jotaiLibrary: CatalogueLibrary = {
  name: "Jotai",
  specifiers: ["jotai", "jotai/utils"],
  documentedVersion: "3.0",
  category: "state",
  type: "frontend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "atom", slots: [{ at: 0, runs: "in-place" }, { at: 1, runs: "kept" }], makes: "state" },
    { kind: "call", name: "useAtom", slots: [], makes: "state" },
    { kind: "call", name: "atomWithStorage", slots: [], makes: "storage" },
  ],
}

export const mobxLibrary: CatalogueLibrary = {
  name: "MobX",
  specifiers: ["mobx", "mobx-react-lite", "mobx-react"],
  documentedVersion: "7.0",
  category: "state",
  type: "frontend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "makeObservable", slots: [], makes: "state" },
    { kind: "call", name: "makeAutoObservable", slots: [], makes: "state" },
    { kind: "call", name: "observable", slots: [], makes: "state" },
    { kind: "call", name: "autorun", slots: [{ at: 0, runs: "effect" }] },
    { kind: "call", name: "observer", slots: [{ at: 0, runs: "kept" }] },
  ],
}

export const nanostoresLibrary: CatalogueLibrary = {
  name: "Nano Stores",
  specifiers: ["nanostores", "@nanostores/react", "@nanostores/vue"],
  documentedVersion: "1.5",
  category: "state",
  type: "frontend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "atom",
      makes: "state",
      methods: [
        { kind: "call", name: "get", slots: [], makes: "state" },
        { kind: "call", name: "set", slots: [], makes: "state" },
        { kind: "call", name: "subscribe", slots: [{ at: 0, runs: "event" }] },
      ],
    },
    { kind: "call", name: "computed", slots: [{ at: 1, runs: "in-place" }], makes: "derived" },
    { kind: "call", name: "onMount", slots: [{ at: 1, runs: "effect" }] },
    { kind: "call", name: "useStore", slots: [], makes: "state" },
  ],
}

export const piniaLibrary: CatalogueLibrary = {
  name: "Pinia",
  specifiers: ["pinia"],
  documentedVersion: "4.0",
  category: "state",
  type: "frontend",
  language: "javascript",
  patterns: [
    {
      kind: "call",
      name: "defineStore",
      slots: [
        { at: SECOND_ARGUMENT, runs: "in-place" },
        { at: "state", runs: "in-place" },
      ],
      makes: "state",
    },
    {
      kind: "factory",
      name: "defineStore",
      methods: [],
      called: {
        slots: [],
        methods: [
          { kind: "call", name: "$subscribe", slots: [{ at: FIRST_ARGUMENT, runs: "event" }] },
          { kind: "call", name: "$onAction", slots: [{ at: FIRST_ARGUMENT, runs: "event" }] },
        ],
      },
    },
  ],
}

export const reduxLibrary: CatalogueLibrary = {
  name: "Redux",
  specifiers: ["redux", "react-redux", "@reduxjs/toolkit"],
  documentedVersion: "5.0",
  category: "state",
  type: "frontend",
  language: "javascript",
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

export const tinybaseLibrary: CatalogueLibrary = {
  name: "TinyBase",
  specifiers: ["tinybase", "tinybase/ui-react"],
  documentedVersion: "10.0",
  category: "state",
  type: "frontend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "createStore",
      makes: "state",
      methods: [
        { kind: "call", name: "setCell", slots: [], makes: "state" },
        { kind: "call", name: "getCell", slots: [], makes: "state" },
        { kind: "call", name: "setRow", slots: [], makes: "state" },
        { kind: "call", name: "getRow", slots: [], makes: "state" },
        { kind: "call", name: "setTable", slots: [], makes: "state" },
        { kind: "call", name: "addTableListener", slots: [{ at: 1, runs: "event" }] },
      ],
    },
    { kind: "call", name: "useCell", slots: [], makes: "state" },
  ],
}

export const valtioLibrary: CatalogueLibrary = {
  name: "Valtio",
  specifiers: ["valtio", "valtio/utils"],
  documentedVersion: "2.3",
  category: "state",
  type: "frontend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "proxy", slots: [], makes: "state" },
    { kind: "call", name: "useSnapshot", slots: [], makes: "state" },
    { kind: "call", name: "snapshot", slots: [], makes: "state" },
    { kind: "call", name: "subscribe", slots: [{ at: 1, runs: "event" }] },
    { kind: "call", name: "subscribeKey", slots: [{ at: THIRD_ARGUMENT, runs: "event" }] },
  ],
}

export const xstateLibrary: CatalogueLibrary = {
  name: "XState",
  specifiers: ["xstate", "@xstate/react", "@xstate/vue"],
  documentedVersion: "5.33",
  category: "state",
  type: "frontend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "createMachine", slots: [], makes: "state" },
    {
      kind: "factory",
      name: "createActor",
      makes: "state",
      methods: [
        { kind: "call", name: "subscribe", slots: [{ at: 0, runs: "event" }] },
        { kind: "call", name: "send", slots: [], makes: "publish" },
      ],
    },
    { kind: "call", name: "fromPromise", slots: [{ at: 0, runs: "kept" }] },
    { kind: "call", name: "assign", slots: [], makes: "state" },
    { kind: "call", name: "useMachine", slots: [], makes: "state" },
    { kind: "call", name: "useSelector", slots: [{ at: 1, runs: "in-place" }], makes: "state" },
  ],
}

const ZUSTAND_STORE_SLOTS: readonly Slot[] = [{ at: 0, runs: "in-place", holdsOwnNodes: true }]

export const zustandLibrary: CatalogueLibrary = {
  name: "Zustand",
  specifiers: ["zustand", "zustand/vanilla", "zustand/middleware"],
  documentedVersion: "5.0",
  category: "state",
  type: "frontend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "create",
      slots: ZUSTAND_STORE_SLOTS,
      makes: "state",
      methods: [
        { kind: "call", name: "getState", slots: [], makes: "state" },
        { kind: "call", name: "setState", slots: [], makes: "state" },
        { kind: "call", name: "subscribe", slots: [{ at: 0, runs: "event" }] },
      ],
      called: {
        slots: ZUSTAND_STORE_SLOTS,
        makes: "state",
      },
    },
    {
      kind: "factory",
      name: "createStore",
      slots: ZUSTAND_STORE_SLOTS,
      makes: "state",
      methods: [
        { kind: "call", name: "getState", slots: [], makes: "state" },
        { kind: "call", name: "setState", slots: [], makes: "state" },
        { kind: "call", name: "subscribe", slots: [{ at: 0, runs: "event" }] },
      ],
    },
    { kind: "call", name: "useStore", slots: [{ at: 1, runs: "in-place" }], makes: "state" },
    { kind: "call", name: "persist", slots: ZUSTAND_STORE_SLOTS, makes: "storage" },
  ],
}
