import type { PatternFixture } from "@/catalogue/types"

const ALIEN_SIGNALS = "alien-signals"

export const alienSignalsFixtures: readonly PatternFixture[] = [
  {
    library: ALIEN_SIGNALS,
    patternKey: "call:signal:*",
    matches: [
      "import { signal } from \"alien-signals\"\nconst count = signal(1)",
    ],
    rejects: [
      "const signal = (...parts) => parts\nconst count = signal(1)",
    ],
  },
  {
    library: ALIEN_SIGNALS,
    patternKey: "call:computed:*",
    matches: [
      "import { computed } from \"alien-signals\"\nconst doubleCount = computed(() => count() * 2)",
    ],
    rejects: [
      "const computed = (...parts) => parts\nconst doubleCount = computed(() => count() * 2)",
    ],
  },
  {
    library: ALIEN_SIGNALS,
    patternKey: "call:effect:*",
    matches: [
      "import { effect } from \"alien-signals\"\neffect(() => { report(count()) })",
    ],
    rejects: [
      "const effect = (...parts) => parts\neffect(() => { report(count()) })",
    ],
  },
  {
    library: ALIEN_SIGNALS,
    patternKey: "call:effectScope:*",
    matches: [
      "import { effectScope } from \"alien-signals\"\nconst stopScope = effectScope(() => { effect(() => { report(count()) }) })",
    ],
    rejects: [
      "const effectScope = (...parts) => parts\nconst stopScope = effectScope(() => { effect(() => { report(count()) }) })",
    ],
  },
]

const REATOM = "Reatom"

export const reatomFixtures: readonly PatternFixture[] = [
  {
    library: REATOM,
    patternKey: "call:atom:*",
    matches: [
      "import { atom } from \"@reatom/core\"\nconst page = atom(1, \"page\")",
    ],
    rejects: [
      "const atom = (...parts) => parts\nconst page = atom(1, \"page\")",
    ],
  },
  {
    library: REATOM,
    patternKey: "call:computed:*",
    matches: [
      "import { computed } from \"@reatom/core\"\nconst isLastPage = computed(() => page() === lastPage(), \"isLastPage\")",
    ],
    rejects: [
      "const computed = (...parts) => parts\nconst isLastPage = computed(() => page() === lastPage(), \"isLastPage\")",
    ],
  },
  {
    library: REATOM,
    patternKey: "call:action:*",
    matches: [
      "import { action } from \"@reatom/core\"\nconst fetchUsers = action(async () => { users.set(await wrap(api.getUsers())) }, \"fetchUsers\")",
    ],
    rejects: [
      "const action = (...parts) => parts\nconst fetchUsers = action(async () => { users.set(await wrap(api.getUsers())) }, \"fetchUsers\")",
    ],
  },
  {
    library: REATOM,
    patternKey: "call:effect:*",
    matches: [
      "import { effect } from \"@reatom/core\"\neffect(() => { report(page()) })",
    ],
    rejects: [
      "const effect = (...parts) => parts\neffect(() => { report(page()) })",
    ],
  },
]

const RESELECT = "Reselect"

export const reselectFixtures: readonly PatternFixture[] = [
  {
    library: RESELECT,
    patternKey: "call:createSelector:*",
    matches: [
      "import { createSelector } from \"reselect\"\nconst selectCompletedTodos = createSelector([(state) => state.todos], (todos) => todos.filter((todo) => todo.completed))",
    ],
    rejects: [
      "const createSelector = (...parts) => parts\nconst selectCompletedTodos = createSelector([(state) => state.todos], (todos) => todos.filter((todo) => todo.completed))",
    ],
  },
  {
    library: RESELECT,
    patternKey: "call:createStructuredSelector:*",
    matches: [
      "import { createStructuredSelector } from \"reselect\"\nconst structuredSelector = createStructuredSelector({ todos: selectTodos, alerts: selectAlerts })",
    ],
    rejects: [
      "const createStructuredSelector = (...parts) => parts\nconst structuredSelector = createStructuredSelector({ todos: selectTodos, alerts: selectAlerts })",
    ],
  },
  {
    library: RESELECT,
    patternKey: "factory:createSelectorCreator:*",
    matches: [
      "import { createSelectorCreator } from \"reselect\"\nconst createAppSelector = createSelectorCreator({ memoize: lruMemoize })",
    ],
    rejects: [
      "const createSelectorCreator = (...parts) => parts\nconst createAppSelector = createSelectorCreator({ memoize: lruMemoize })",
    ],
  },
  {
    library: RESELECT,
    patternKey: "factory:createSelectorCreator:*>called",
    matches: [
      "import { createSelectorCreator } from \"reselect\"\nconst createAppSelector = createSelectorCreator({ memoize: lruMemoize })\nconst selectCompleted = createAppSelector([selectTodos], (todos) => todos.filter((todo) => todo.completed))",
    ],
    rejects: [
      "const createAppSelector = makeLocalRegistry()\nconst selectCompleted = createAppSelector([selectTodos], (todos) => todos.filter((todo) => todo.completed))",
    ],
  },
]

const RXJS = "RxJS"

export const rxjsFixtures: readonly PatternFixture[] = [
  {
    library: RXJS,
    patternKey: "factory:Subject:*",
    matches: [
      "import { Subject } from \"rxjs\"\nconst subject = new Subject()",
    ],
    rejects: [
      "class Subject {}\nconst subject = new Subject()",
    ],
  },
  {
    library: RXJS,
    patternKey: "factory:Subject:*>call:next:*",
    matches: [
      "import { Subject } from \"rxjs\"\nconst subject = new Subject()\nsubject.next(1)",
    ],
    rejects: [
      "const subject = makeLocalRegistry()\nsubject.next(1)",
    ],
  },
  {
    library: RXJS,
    patternKey: "factory:Subject:*>call:subscribe:*",
    matches: [
      "import { Subject } from \"rxjs\"\nconst subject = new Subject()\nsubject.subscribe({ next: (value) => report(value) })",
    ],
    rejects: [
      "const subject = makeLocalRegistry()\nsubject.subscribe({ next: (value) => report(value) })",
    ],
  },
  {
    library: RXJS,
    patternKey: "factory:BehaviorSubject:*",
    matches: [
      "import { BehaviorSubject } from \"rxjs\"\nconst subject = new BehaviorSubject(0)",
    ],
    rejects: [
      "class BehaviorSubject {}\nconst subject = new BehaviorSubject(0)",
    ],
  },
  {
    library: RXJS,
    patternKey: "factory:BehaviorSubject:*>call:next:*",
    matches: [
      "import { BehaviorSubject } from \"rxjs\"\nconst subject = new BehaviorSubject(0)\nsubject.next(1)",
    ],
    rejects: [
      "const subject = makeLocalRegistry()\nsubject.next(1)",
    ],
  },
  {
    library: RXJS,
    patternKey: "factory:BehaviorSubject:*>call:subscribe:*",
    matches: [
      "import { BehaviorSubject } from \"rxjs\"\nconst subject = new BehaviorSubject(0)\nsubject.subscribe({ next: (value) => report(value) })",
    ],
    rejects: [
      "const subject = makeLocalRegistry()\nsubject.subscribe({ next: (value) => report(value) })",
    ],
  },
  {
    library: RXJS,
    patternKey: "factory:fromEvent:*",
    matches: [
      "import { fromEvent } from \"rxjs\"\nconst clicks = fromEvent(document, \"click\")",
    ],
    rejects: [
      "const fromEvent = (...parts) => parts\nconst clicks = fromEvent(document, \"click\")",
    ],
  },
  {
    library: RXJS,
    patternKey: "factory:fromEvent:*>call:subscribe:*",
    matches: [
      "import { fromEvent } from \"rxjs\"\nconst clicks = fromEvent(document, \"click\")\nclicks.subscribe((event) => report(event))",
    ],
    rejects: [
      "const clicks = makeLocalRegistry()\nclicks.subscribe((event) => report(event))",
    ],
  },
  {
    library: RXJS,
    patternKey: "call:map:*",
    matches: [
      "import { map } from \"rxjs\"\nconst doubled = source.pipe(map((value) => value * 2))",
    ],
    rejects: [
      "const map = (...parts) => parts\nconst doubled = source.pipe(map((value) => value * 2))",
    ],
  },
  {
    library: RXJS,
    patternKey: "call:filter:*",
    matches: [
      "import { filter } from \"rxjs\"\nconst odd = source.pipe(filter((value) => value % 2 === 1))",
    ],
    rejects: [
      "const filter = (...parts) => parts\nconst odd = source.pipe(filter((value) => value % 2 === 1))",
    ],
  },
]

const SIGNALS = "Signals"

export const signalsFixtures: readonly PatternFixture[] = [
  {
    library: SIGNALS,
    patternKey: "call:signal:*",
    matches: [
      "import { signal } from \"@preact/signals-core\"\nconst count = signal(0)",
    ],
    rejects: [
      "const signal = (...parts) => parts\nconst count = signal(0)",
    ],
  },
  {
    library: SIGNALS,
    patternKey: "call:computed:*",
    matches: [
      "import { computed } from \"@preact/signals-core\"\nconst double = computed(() => count.value * 2)",
    ],
    rejects: [
      "const computed = (...parts) => parts\nconst double = computed(() => count.value * 2)",
    ],
  },
  {
    library: SIGNALS,
    patternKey: "call:effect:*",
    matches: [
      "import { effect } from \"@preact/signals-core\"\neffect(() => { report(count.value) })",
    ],
    rejects: [
      "const effect = (...parts) => parts\neffect(() => { report(count.value) })",
    ],
  },
  {
    library: SIGNALS,
    patternKey: "call:batch:*",
    matches: [
      "import { batch } from \"@preact/signals-core\"\nbatch(() => { name.value = \"Jane\"; surname.value = \"Doe\" })",
    ],
    rejects: [
      "const batch = (...parts) => parts\nbatch(() => { name.value = \"Jane\"; surname.value = \"Doe\" })",
    ],
  },
  {
    library: SIGNALS,
    patternKey: "call:useSignal:*",
    matches: [
      "import { useSignal } from \"@preact/signals-react\"\nconst count = useSignal(0)",
    ],
    rejects: [
      "const useSignal = (...parts) => parts\nconst count = useSignal(0)",
    ],
  },
  {
    library: SIGNALS,
    patternKey: "call:useComputed:*",
    matches: [
      "import { useComputed } from \"@preact/signals-react\"\nconst double = useComputed(() => count.value * 2)",
    ],
    rejects: [
      "const useComputed = (...parts) => parts\nconst double = useComputed(() => count.value * 2)",
    ],
  },
  {
    library: SIGNALS,
    patternKey: "call:useSignalEffect:*",
    matches: [
      "import { useSignalEffect } from \"@preact/signals-react\"\nuseSignalEffect(() => { report(count.value) })",
    ],
    rejects: [
      "const useSignalEffect = (...parts) => parts\nuseSignalEffect(() => { report(count.value) })",
    ],
  },
]
