import type { PatternFixture } from "@/catalogue/types"

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
