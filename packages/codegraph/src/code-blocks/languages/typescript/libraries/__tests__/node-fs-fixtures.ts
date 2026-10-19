import type { PatternFixture } from "@/catalogue/types"
import { NODE_FS_ASYNC_NAMES, NODE_FS_PROMISES_NAMES, NODE_FS_STREAM_NAMES, NODE_FS_SYNC_NAMES } from "@/code-blocks/languages/typescript/libraries/node-fs"

const NODE_FS = "Node.js fs"

const NODE_FS_LOCAL = "const fs = makeLocalStore()"

const nodeFsCalled = (name: string): string => `fs.${name}("uploads/report.csv")`

const nodeFsFixture = (name: string, extraMatches: readonly string[] = []): PatternFixture => ({
  library: NODE_FS,
  patternKey: `call:${name}:*`,
  matches: [`import fs from "node:fs"\n${nodeFsCalled(name)}`, `const fs = require("fs")\n${nodeFsCalled(name)}`, ...extraMatches],
  rejects: [`${NODE_FS_LOCAL}\n${nodeFsCalled(name)}`],
})

const nodeFsPromisesImport = (name: string): string => `import { ${name} } from "node:fs/promises"\nawait ${name}("uploads/report.csv")`

export const nodeFsFixtures: readonly PatternFixture[] = [
  ...NODE_FS_ASYNC_NAMES.map((name) => nodeFsFixture(name, [nodeFsPromisesImport(name)])),
  ...[...NODE_FS_SYNC_NAMES, ...NODE_FS_STREAM_NAMES].map((name) => nodeFsFixture(name, [`import { ${name} } from "fs"\n${name}("uploads/report.csv")`])),
  ...NODE_FS_PROMISES_NAMES.map((name) => nodeFsFixture(name, [`import { promises } from "fs"\nawait ${name}("uploads/report.csv")`])),
]
