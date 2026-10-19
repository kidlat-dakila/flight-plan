import type { PatternFixture } from "@/catalogue/types"

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
