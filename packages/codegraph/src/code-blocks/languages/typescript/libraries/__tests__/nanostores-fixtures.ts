import type { PatternFixture } from "@/catalogue/types"

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
  {
    library: NANOSTORES,
    patternKey: "factory:atom:*>call:listen:*",
    matches: [
      "import { atom } from \"nanostores\"\nconst $counter = atom(0)\n$counter.listen((value) => report(value))",
    ],
    rejects: [
      "const None = makeLocalRegistry()\n$counter.listen((value) => report(value))",
    ],
  },
  {
    library: NANOSTORES,
    patternKey: "factory:map:*",
    matches: [
      "import { map } from \"nanostores\"\nconst $profile = map({ name: \"anonymous\" })",
    ],
    rejects: [
      "const map = (...parts) => parts\nconst $profile = map({ name: \"anonymous\" })",
    ],
  },
  {
    library: NANOSTORES,
    patternKey: "factory:map:*>call:get:*",
    matches: [
      "import { map } from \"nanostores\"\nconst $profile = map({ name: \"anonymous\" })\nconst profile = $profile.get()",
    ],
    rejects: [
      "const $profile = makeLocalRegistry()\nconst profile = $profile.get()",
    ],
  },
  {
    library: NANOSTORES,
    patternKey: "factory:map:*>call:set:*",
    matches: [
      "import { map } from \"nanostores\"\nconst $profile = map({ name: \"anonymous\" })\n$profile.set({ name: \"Kazimir\" })",
    ],
    rejects: [
      "const $profile = makeLocalRegistry()\n$profile.set({ name: \"Kazimir\" })",
    ],
  },
  {
    library: NANOSTORES,
    patternKey: "factory:map:*>call:subscribe:*",
    matches: [
      "import { map } from \"nanostores\"\nconst $profile = map({ name: \"anonymous\" })\n$profile.subscribe((profile) => report(profile.name))",
    ],
    rejects: [
      "const $profile = makeLocalRegistry()\n$profile.subscribe((profile) => report(profile.name))",
    ],
  },
  {
    library: NANOSTORES,
    patternKey: "factory:map:*>call:listen:*",
    matches: [
      "import { map } from \"nanostores\"\nconst $profile = map({ name: \"anonymous\" })\n$profile.listen((profile, oldProfile, changed) => report(changed))",
    ],
    rejects: [
      "const $profile = makeLocalRegistry()\n$profile.listen((profile, oldProfile, changed) => report(changed))",
    ],
  },
  {
    library: NANOSTORES,
    patternKey: "factory:map:*>call:setKey:*",
    matches: [
      "import { map } from \"nanostores\"\nconst $profile = map({ name: \"anonymous\" })\n$profile.setKey(\"name\", \"Kazimir Malevich\")",
    ],
    rejects: [
      "const $profile = makeLocalRegistry()\n$profile.setKey(\"name\", \"Kazimir Malevich\")",
    ],
  },
]
