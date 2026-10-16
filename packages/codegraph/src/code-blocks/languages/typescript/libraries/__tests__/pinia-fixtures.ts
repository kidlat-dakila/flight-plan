import type { PatternFixture } from "@/catalogue/types"

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
