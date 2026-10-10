import type { PatternFixture } from "@/catalogue/types"

const JAVASCRIPT_TEST_FILES = "JavaScript test and story files"

export const javascriptTestFilesFixtures: readonly PatternFixture[] = [
  {
    library: JAVASCRIPT_TEST_FILES,
    patternKey: "file:**/*.test.*:*",
    matches: ["src/cart.test.ts", "cart.test.tsx"],
    rejects: ["src/test-utils.ts", "src/contest.ts"],
  },
  {
    library: JAVASCRIPT_TEST_FILES,
    patternKey: "file:**/*.spec.*:*",
    matches: ["src/cart.spec.tsx", "e2e/checkout.spec.ts"],
    rejects: ["src/spec.ts", "src/specification.ts"],
  },
  {
    library: JAVASCRIPT_TEST_FILES,
    patternKey: "file:**/*.stories.*:*",
    matches: ["src/Button.stories.tsx", "Button.stories.mdx"],
    rejects: ["src/stories/index.ts", "src/stories.ts"],
  },
  {
    library: JAVASCRIPT_TEST_FILES,
    patternKey: "file:**/__tests__/**:*",
    matches: ["__tests__/cart.ts", "src/cart/__tests__/fixture.ts"],
    rejects: ["src/tests/cart.ts", "src/__tests__.ts"],
  },
]
