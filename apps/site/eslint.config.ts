import baseConfig, { defineProjectConfig, moduleBoundaries, node, react } from "../../eslint.base.config"

const DEMO_IMPORTS = [
  String.raw`^@flightplan/backend/(context|demo-reviews|router)$`,
  String.raw`^@flightplan/frontend/app$`,
  String.raw`^@flightplan/playground-fixtures$`,
]

const GENERATED_FOLDERS = ["public/**", ".astro/**", "dist/**"]
const DEMO_DATA_FILES = ["demo/data/**/*.ts"]
const NODE_FILES = [...DEMO_DATA_FILES, "src/components/demo-index.ts"]
const SERVER_IN_BROWSER = "@trpc/server"

const demoBoundaries = moduleBoundaries(DEMO_IMPORTS)

const allowServerInBrowser = (constraint: (typeof demoBoundaries.depConstraints)[number]) =>
  constraint.sourceTag === "platform:browser" && constraint.bannedExternalImports !== undefined
    ? { ...constraint, bannedExternalImports: constraint.bannedExternalImports.filter((name) => name !== SERVER_IN_BROWSER) }
    : constraint

export default defineProjectConfig(
  { ignores: GENERATED_FOLDERS },
  baseConfig,
  react,
  {
    rules: {
      "@nx/enforce-module-boundaries": [
        "error",
        { ...demoBoundaries, depConstraints: demoBoundaries.depConstraints.map(allowServerInBrowser) },
      ],
    },
  },
  ...node.map((config) => ({ ...config, files: NODE_FILES })),
  {
    files: DEMO_DATA_FILES,
    rules: {
      "no-console": "off",
      "no-restricted-properties": "off",
    },
  },
)
