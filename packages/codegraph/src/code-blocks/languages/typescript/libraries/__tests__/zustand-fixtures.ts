import type { PatternFixture } from "@/catalogue/types"

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
  {
    library: ZUSTAND,
    patternKey: "call:devtools:*",
    matches: [
      "import { devtools } from \"zustand/middleware\"\nconst useBearStore = create(devtools((set) => ({ bears: 0, addBear: () => set((state) => ({ bears: state.bears + 1 })) }), { name: \"bears\" }))",
    ],
    rejects: [
      "const devtools = (...parts) => parts\nconst useBearStore = create(devtools((set) => ({ bears: 0, addBear: () => set((state) => ({ bears: state.bears + 1 })) }), { name: \"bears\" }))",
    ],
  },
]
