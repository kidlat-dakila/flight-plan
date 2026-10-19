import type { PatternFixture } from "@/catalogue/types"

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
