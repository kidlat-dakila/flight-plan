import type { PatternFixture } from "@/catalogue/types"

const FUNCTOOLS = "functools"

export const functoolsFixtures: readonly PatternFixture[] = [
  {
    library: FUNCTOOLS,
    patternKey: "call:partial:*",
    matches: ["from functools import partial\n\nbasetwo = partial(int, base=2)", "import functools\n\nbasetwo = functools.partial(int, base=2)"],
    rejects: ["def partial(func, **keywords):\n    return func\n\nbasetwo = partial(int, base=2)"],
  },
]
