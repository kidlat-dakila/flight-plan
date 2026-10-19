import type { PatternFixture } from "@/catalogue/types"

const NODE_UTIL = "Node.js util"

export const nodeUtilFixtures: readonly PatternFixture[] = [
  {
    library: NODE_UTIL,
    patternKey: "call:promisify:*",
    matches: [
      "import { promisify } from \"node:util\"\nimport { stat } from \"node:fs\"\nconst promisifiedStat = promisify(stat)",
      "const util = require(\"node:util\")\nconst fs = require(\"node:fs\")\nconst stat = util.promisify(fs.stat)",
    ],
    rejects: ["const promisify = (original) => original\nconst promisifiedStat = promisify(stat)"],
  },
]
