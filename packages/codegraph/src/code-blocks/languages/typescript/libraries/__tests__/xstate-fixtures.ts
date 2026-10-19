import type { PatternFixture } from "@/catalogue/types"

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
  {
    library: XSTATE,
    patternKey: "factory:createStore:*",
    matches: [
      "import { createStore } from \"@xstate/store\"\nconst counterStore = createStore({ context: { count: 0 }, on: { inc: (context, event) => ({ count: context.count + event.by }) } })",
    ],
    rejects: [
      "const createStore = (...parts) => parts\nconst counterStore = createStore({ context: { count: 0 }, on: { inc: (context, event) => ({ count: context.count + event.by }) } })",
    ],
  },
  {
    library: XSTATE,
    patternKey: "factory:createStore:*>call:getSnapshot:*",
    matches: [
      "import { createStore } from \"@xstate/store\"\nconst counterStore = createStore({ context: { count: 0 }, on: { inc: (context, event) => ({ count: context.count + event.by }) } })\nconst count = counterStore.getSnapshot().context.count",
    ],
    rejects: [
      "const counterStore = makeLocalRegistry()\nconst count = counterStore.getSnapshot().context.count",
    ],
  },
  {
    library: XSTATE,
    patternKey: "factory:createStore:*>call:send:*",
    matches: [
      "import { createStore } from \"@xstate/store\"\nconst counterStore = createStore({ context: { count: 0 }, on: { inc: (context, event) => ({ count: context.count + event.by }) } })\ncounterStore.send({ type: \"inc\", by: 1 })",
    ],
    rejects: [
      "const counterStore = makeLocalRegistry()\ncounterStore.send({ type: \"inc\", by: 1 })",
    ],
  },
  {
    library: XSTATE,
    patternKey: "factory:createStore:*>call:subscribe:*",
    matches: [
      "import { createStore } from \"@xstate/store\"\nconst counterStore = createStore({ context: { count: 0 }, on: { inc: (context, event) => ({ count: context.count + event.by }) } })\ncounterStore.subscribe((snapshot) => report(snapshot.context.count))",
    ],
    rejects: [
      "const counterStore = makeLocalRegistry()\ncounterStore.subscribe((snapshot) => report(snapshot.context.count))",
    ],
  },
  {
    library: XSTATE,
    patternKey: "factory:createStore:*>call:on:*",
    matches: [
      "import { createStore } from \"@xstate/store\"\nconst counterStore = createStore({ context: { count: 0 }, on: { inc: (context, event) => ({ count: context.count + event.by }) } })\ncounterStore.on(\"increased\", (event) => report(event.by))",
    ],
    rejects: [
      "const counterStore = makeLocalRegistry()\ncounterStore.on(\"increased\", (event) => report(event.by))",
    ],
  },
]
