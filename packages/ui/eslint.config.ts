import baseConfig, { defineProjectConfig, moduleBoundaries, react } from "../../eslint.base.config"

const DATA_ACCESS_GLOBALS = ["fetch", "localStorage", "sessionStorage"]

const RENDER_ONLY_MESSAGE = "Components in packages/ui render props only. They never call an API or touch browser storage."

const SIBLING_COMPONENT_IMPORT = String.raw`^@flightplan/ui/.+$`

export default defineProjectConfig(
  baseConfig,
  react,
  {
    rules: {
      "no-restricted-globals": ["error", ...DATA_ACCESS_GLOBALS.map((name) => ({ name, message: RENDER_ONLY_MESSAGE }))],
      "@nx/enforce-module-boundaries": ["error", moduleBoundaries([SIBLING_COMPONENT_IMPORT])],
    },
  },
  {
    files: ["src/components/**"],
    rules: {
      "import-x/prefer-default-export": ["error", { target: "any" }],
    },
  },
)
