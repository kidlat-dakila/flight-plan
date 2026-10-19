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
