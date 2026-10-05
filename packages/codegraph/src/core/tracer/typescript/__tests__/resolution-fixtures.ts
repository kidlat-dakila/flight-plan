interface FixtureChange { path: string, changes: readonly (readonly number[])[] }

export interface ResolutionFixture { id: string, why: string, files: Record<string, string>, changed: readonly FixtureChange[] }

export const RESOLUTION_FIXTURES: readonly ResolutionFixture[] = [
  {
    id: "resolve-paths",
    why: "tsconfig paths alias @/*",
    files: {
      "tsconfig.json": "{\"compilerOptions\": {\"paths\": {\"@/*\": [\"./src/*\"]}}}",
      "src/pricing.ts": "export function priceOf() { return 1 }",
      "src/app/checkout.ts": "import { priceOf } from \"@/pricing\"\nexport function checkout() { return priceOf() }",
    },
    changed: [
      {
        path: "src/pricing.ts",
        changes: [
          [
            1,
            1,
          ],
        ],
      },
    ],
  },
  {
    id: "resolve-paths-baseurl",
    why: "paths resolved against baseUrl",
    files: {
      "tsconfig.json": "{\"compilerOptions\": {\"baseUrl\": \"src\", \"paths\": {\"~lib/*\": [\"lib/*\"]}}}",
      "src/lib/pricing.ts": "export function priceOf() { return 1 }",
      "src/app/checkout.ts": "import { priceOf } from \"~lib/pricing\"\nexport function checkout() { return priceOf() }",
    },
    changed: [
      {
        path: "src/lib/pricing.ts",
        changes: [
          [
            1,
            1,
          ],
        ],
      },
    ],
  },
  {
    id: "resolve-baseurl-bare",
    why: "baseUrl alone resolves a bare specifier",
    files: {
      "tsconfig.json": "{\"compilerOptions\": {\"baseUrl\": \"src\"}}",
      "src/lib/pricing.ts": "export function priceOf() { return 1 }",
      "src/app/checkout.ts": "import { priceOf } from \"lib/pricing\"\nexport function checkout() { return priceOf() }",
    },
    changed: [
      {
        path: "src/lib/pricing.ts",
        changes: [
          [
            1,
            1,
          ],
        ],
      },
    ],
  },
  {
    id: "resolve-extends",
    why: "package tsconfig extends a base that holds the paths",
    files: {
      "tsconfig.base.json": "{\"compilerOptions\": {\"paths\": {\"@core/*\": [\"packages/core/src/*\"]}}}",
      "packages/web/tsconfig.json": "{\"extends\": \"../../tsconfig.base.json\"}",
      "packages/core/src/pricing.ts": "export function priceOf() { return 1 }",
      "packages/web/src/checkout.ts": "import { priceOf } from \"@core/pricing\"\nexport function checkout() { return priceOf() }",
    },
    changed: [
      {
        path: "packages/core/src/pricing.ts",
        changes: [
          [
            1,
            1,
          ],
        ],
      },
    ],
  },
  {
    id: "resolve-extends-no-ext",
    why: "extends without the .json extension",
    files: {
      "tsconfig.base.json": "{\"compilerOptions\": {\"paths\": {\"@core/*\": [\"packages/core/src/*\"]}}}",
      "packages/web/tsconfig.json": "{\"extends\": \"../../tsconfig.base\"}",
      "packages/core/src/pricing.ts": "export function priceOf() { return 1 }",
      "packages/web/src/checkout.ts": "import { priceOf } from \"@core/pricing\"\nexport function checkout() { return priceOf() }",
    },
    changed: [
      {
        path: "packages/core/src/pricing.ts",
        changes: [
          [
            1,
            1,
          ],
        ],
      },
    ],
  },
  {
    id: "resolve-extends-package",
    why: "extends a package config (not in git): its aliases are lost",
    files: {
      "tsconfig.json": "{\"extends\": \"@acme/tsconfig/base.json\"}",
      "src/pricing.ts": "export function priceOf() { return 1 }",
      "src/app/checkout.ts": "import { priceOf } from \"@/pricing\"\nexport function checkout() { return priceOf() }",
    },
    changed: [
      {
        path: "src/pricing.ts",
        changes: [
          [
            1,
            1,
          ],
        ],
      },
    ],
  },
  {
    id: "resolve-nearest-config",
    why: "the nearest tsconfig wins, even when it declares nothing",
    files: {
      "tsconfig.json": "{\"compilerOptions\": {\"paths\": {\"@/*\": [\"./src/*\"]}}}",
      "src/app/tsconfig.json": "{\"compilerOptions\": {\"strict\": true}}",
      "src/pricing.ts": "export function priceOf() { return 1 }",
      "src/app/checkout.ts": "import { priceOf } from \"@/pricing\"\nexport function checkout() { return priceOf() }",
    },
    changed: [
      {
        path: "src/pricing.ts",
        changes: [
          [
            1,
            1,
          ],
        ],
      },
    ],
  },
  {
    id: "resolve-paths-order",
    why: "two overlapping patterns: which one wins",
    files: {
      "tsconfig.json": "{\"compilerOptions\": {\"paths\": {\"@/*\": [\"./src/*\"], \"@/lib/*\": [\"./shared/lib/*\"]}}}",
      "src/lib/pricing.ts": "export function priceOf() { return 1 }",
      "shared/lib/pricing.ts": "export function priceOf() { return 1 }",
      "src/app/checkout.ts": "import { priceOf } from \"@/lib/pricing\"\nexport function checkout() { return priceOf() }",
    },
    changed: [
      {
        path: "shared/lib/pricing.ts",
        changes: [
          [
            1,
            1,
          ],
        ],
      },
    ],
  },
  {
    id: "resolve-paths-fallback",
    why: "a paths entry with two targets, the first missing",
    files: {
      "tsconfig.json": "{\"compilerOptions\": {\"paths\": {\"@/*\": [\"./gen/*\", \"./src/*\"]}}}",
      "src/pricing.ts": "export function priceOf() { return 1 }",
      "src/app/checkout.ts": "import { priceOf } from \"@/pricing\"\nexport function checkout() { return priceOf() }",
    },
    changed: [
      {
        path: "src/pricing.ts",
        changes: [
          [
            1,
            1,
          ],
        ],
      },
    ],
  },
  {
    id: "resolve-jsonc",
    why: "a tsconfig with comments and a trailing comma",
    files: {
      "tsconfig.json": "{\n  // aliases\n  \"compilerOptions\": { \"paths\": { \"@/*\": [\"./src/*\"], }, },\n}\n",
      "src/pricing.ts": "export function priceOf() { return 1 }",
      "src/app/checkout.ts": "import { priceOf } from \"@/pricing\"\nexport function checkout() { return priceOf() }",
    },
    changed: [
      {
        path: "src/pricing.ts",
        changes: [
          [
            1,
            1,
          ],
        ],
      },
    ],
  },
  {
    id: "resolve-pkg-source",
    why: "workspace package entry from the source field",
    files: {
      "packages/core/package.json": "{\"name\": \"@org/core\", \"source\": \"src/index.ts\", \"main\": \"dist/index.js\"}",
      "packages/core/src/index.ts": "export { priceOf } from \"./pricing\"",
      "packages/core/src/pricing.ts": "export function priceOf() { return 1 }",
      "packages/web/src/checkout.ts": "import { priceOf } from \"@org/core\"\nexport function checkout() { return priceOf() }",
    },
    changed: [
      {
        path: "packages/core/src/pricing.ts",
        changes: [
          [
            1,
            1,
          ],
        ],
      },
    ],
  },
  {
    id: "resolve-pkg-exports-dist",
    why: "exports points at untracked dist: falls back to main, then src",
    files: {
      "packages/core/package.json": "{\"name\": \"@org/core\", \"exports\": {\".\": {\"import\": \"./dist/index.mjs\", \"types\": \"./dist/index.d.ts\"}}, \"main\": \"dist/index.js\"}",
      "packages/core/src/index.ts": "export { priceOf } from \"./pricing\"",
      "packages/core/src/pricing.ts": "export function priceOf() { return 1 }",
      "packages/web/src/checkout.ts": "import { priceOf } from \"@org/core\"\nexport function checkout() { return priceOf() }",
    },
    changed: [
      {
        path: "packages/core/src/pricing.ts",
        changes: [
          [
            1,
            1,
          ],
        ],
      },
    ],
  },
  {
    id: "resolve-pkg-types",
    why: "entry from the types field",
    files: {
      "packages/core/package.json": "{\"name\": \"@org/core\", \"types\": \"lib/main.ts\"}",
      "packages/core/lib/main.ts": "export function priceOf() { return 1 }",
      "packages/web/src/checkout.ts": "import { priceOf } from \"@org/core\"\nexport function checkout() { return priceOf() }",
    },
    changed: [
      {
        path: "packages/core/lib/main.ts",
        changes: [
          [
            1,
            1,
          ],
        ],
      },
    ],
  },
  {
    id: "resolve-pkg-subpath",
    why: "a subpath under a workspace package",
    files: {
      "packages/core/package.json": "{\"name\": \"@org/core\", \"main\": \"dist/index.js\"}",
      "packages/core/src/pricing.ts": "export function priceOf() { return 1 }",
      "packages/web/src/checkout.ts": "import { priceOf } from \"@org/core/src/pricing\"\nexport function checkout() { return priceOf() }",
    },
    changed: [
      {
        path: "packages/core/src/pricing.ts",
        changes: [
          [
            1,
            1,
          ],
        ],
      },
    ],
  },
  {
    id: "resolve-pkg-longest",
    why: "a package name that is a prefix of another",
    files: {
      "packages/core/package.json": "{\"name\": \"@org/core\", \"source\": \"src/index.ts\"}",
      "packages/core-ui/package.json": "{\"name\": \"@org/core-ui\", \"source\": \"src/index.ts\"}",
      "packages/core/src/index.ts": "export const other = 1",
      "packages/core-ui/src/index.ts": "export function priceOf() { return 1 }",
      "packages/web/src/checkout.ts": "import { priceOf } from \"@org/core-ui\"\nexport function checkout() { return priceOf() }",
    },
    changed: [
      {
        path: "packages/core-ui/src/index.ts",
        changes: [
          [
            1,
            1,
          ],
        ],
      },
    ],
  },
  {
    id: "resolve-emitted-js",
    why: "a .js specifier naming a .ts source (nodenext)",
    files: {
      "src/pricing.ts": "export function priceOf() { return 1 }",
      "src/checkout.ts": "import { priceOf } from \"./pricing.js\"\nexport function checkout() { return priceOf() }",
    },
    changed: [
      {
        path: "src/pricing.ts",
        changes: [
          [
            1,
            1,
          ],
        ],
      },
    ],
  },
  {
    id: "resolve-emitted-jsx",
    why: "a .jsx specifier naming a .tsx source",
    files: {
      "src/Price.tsx": "export function priceOf() { return <b>1</b> }",
      "src/checkout.tsx": "import { priceOf } from \"./Price.jsx\"\nexport function checkout() { return priceOf() }",
    },
    changed: [
      {
        path: "src/Price.tsx",
        changes: [
          [
            1,
            1,
          ],
        ],
      },
    ],
  },
  {
    id: "resolve-index",
    why: "a directory import lands on its index file",
    files: {
      "src/pricing/index.ts": "export function priceOf() { return 1 }",
      "src/checkout.ts": "import { priceOf } from \"./pricing\"\nexport function checkout() { return priceOf() }",
    },
    changed: [
      {
        path: "src/pricing/index.ts",
        changes: [
          [
            1,
            1,
          ],
        ],
      },
    ],
  },
  {
    id: "resolve-index-tsx",
    why: "a directory import lands on index.tsx",
    files: {
      "src/pricing/index.tsx": "export function priceOf() { return 1 }",
      "src/checkout.ts": "import { priceOf } from \"./pricing\"\nexport function checkout() { return priceOf() }",
    },
    changed: [
      {
        path: "src/pricing/index.tsx",
        changes: [
          [
            1,
            1,
          ],
        ],
      },
    ],
  },
  {
    id: "resolve-ext-order",
    why: "a stem with both .ts and .js: which one",
    files: {
      "src/pricing.ts": "export function priceOf() { return 1 }",
      "src/pricing.js": "export function priceOf() { return 1 }",
      "src/checkout.ts": "import { priceOf } from \"./pricing\"\nexport function checkout() { return priceOf() }",
    },
    changed: [
      {
        path: "src/pricing.ts",
        changes: [
          [
            1,
            1,
          ],
        ],
      },
    ],
  },
  {
    id: "resolve-dir-package-json",
    why: "a relative directory with its own package.json main",
    files: {
      "src/pricing/package.json": "{\"main\": \"lib.ts\"}",
      "src/pricing/lib.ts": "export function priceOf() { return 1 }",
      "src/pricing/index.ts": "export const other = 1",
      "src/checkout.ts": "import { priceOf } from \"./pricing\"\nexport function checkout() { return priceOf() }",
    },
    changed: [
      {
        path: "src/pricing/lib.ts",
        changes: [
          [
            1,
            1,
          ],
        ],
      },
    ],
  },
  {
    id: "resolve-above-root",
    why: "a specifier that climbs above the repository root",
    files: {
      "src/pricing.ts": "export function priceOf() { return 1 }",
      "src/checkout.ts": "import { priceOf } from \"../../pricing\"\nexport function checkout() { return priceOf() }",
    },
    changed: [
      {
        path: "src/pricing.ts",
        changes: [
          [
            1,
            1,
          ],
        ],
      },
    ],
  },
  {
    id: "resolve-dts",
    why: "a .d.ts next to the source",
    files: {
      "src/pricing.d.ts": "export declare function priceOf(): number",
      "src/pricing.ts": "export function priceOf() { return 1 }",
      "src/checkout.ts": "import { priceOf } from \"./pricing\"\nexport function checkout() { return priceOf() }",
    },
    changed: [
      {
        path: "src/pricing.ts",
        changes: [
          [
            1,
            1,
          ],
        ],
      },
    ],
  },
  {
    id: "resolve-require",
    why: "require() of a relative file",
    files: {
      "src/pricing.js": "function priceOf() { return 1 }\nmodule.exports = { priceOf }",
      "src/checkout.js": "const { priceOf } = require(\"./pricing\")\nfunction checkout() { return priceOf() }",
    },
    changed: [
      {
        path: "src/pricing.js",
        changes: [
          [
            1,
            1,
          ],
        ],
      },
    ],
  },
]
