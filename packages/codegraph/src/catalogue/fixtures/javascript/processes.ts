import type { PatternFixture } from "@/catalogue/types"

const EXECA = "Execa"

export const execaFixtures: readonly PatternFixture[] = [
  {
    library: EXECA,
    patternKey: "call:execa:*",
    matches: [
      "import { execa } from \"execa\"\nconst { stdout } = await execa(\"npm\", [\"run\", \"build\"])",
      "import { execa } from \"execa\"\nconst { stdout } = await execa`npm run build`",
    ],
    rejects: [
      "const execa = (...parts) => parts\nconst { stdout } = await execa(\"npm\", [\"run\", \"build\"])",
    ],
  },
  {
    library: EXECA,
    patternKey: "call:execaSync:*",
    matches: [
      "import { execaSync } from \"execa\"\nconst { stdout } = execaSync`npm run build`",
    ],
    rejects: [
      "const execaSync = (...parts) => parts\nconst { stdout } = execaSync`npm run build`",
    ],
  },
  {
    library: EXECA,
    patternKey: "call:execaNode:*",
    matches: [
      "import { execaNode } from \"execa\"\nconst subprocess = execaNode(\"child.js\", [\"--verbose\"])",
    ],
    rejects: [
      "const execaNode = (...parts) => parts\nconst subprocess = execaNode(\"child.js\", [\"--verbose\"])",
    ],
  },
  {
    library: EXECA,
    patternKey: "call:execaCommand:*",
    matches: [
      "import { execaCommand } from \"execa\"\nconst { stdout } = await execaCommand(\"echo unicorns\")",
    ],
    rejects: [
      "const execaCommand = (...parts) => parts\nconst { stdout } = await execaCommand(\"echo unicorns\")",
    ],
  },
  {
    library: EXECA,
    patternKey: "call:execaCommandSync:*",
    matches: [
      "import { execaCommandSync } from \"execa\"\nconst { stdout } = execaCommandSync(\"echo unicorns\")",
    ],
    rejects: [
      "const execaCommandSync = (...parts) => parts\nconst { stdout } = execaCommandSync(\"echo unicorns\")",
    ],
  },
  {
    library: EXECA,
    patternKey: "call:$:*",
    matches: [
      "import { $ } from \"execa\"\nconst branch = await $`git branch --show-current`",
    ],
    rejects: [
      "const $ = (...parts) => parts\nconst branch = await $`git branch --show-current`",
    ],
  },
  {
    library: EXECA,
    patternKey: "call:$.sync:*",
    matches: [
      "import { $ } from \"execa\"\nconst { stdout } = $.sync`npm run build`",
    ],
    rejects: [
      "const $ = makeLocalShell()\nconst { stdout } = $.sync`npm run build`",
    ],
  },
  {
    library: EXECA,
    patternKey: "call:$.s:*",
    matches: [
      "import { $ } from \"execa\"\nconst { stdout } = $.s`npm run build`",
    ],
    rejects: [
      "const $ = makeLocalShell()\nconst { stdout } = $.s`npm run build`",
    ],
  },
]

const PISCINA = "Piscina"

export const piscinaFixtures: readonly PatternFixture[] = [
  {
    library: PISCINA,
    patternKey: "factory:Piscina:*",
    matches: [
      "import { Piscina } from \"piscina\"\nconst piscina = new Piscina({ filename: new URL(\"./worker.mjs\", import.meta.url).href })",
    ],
    rejects: [
      "const Piscina = makeLocalPool\nconst piscina = new Piscina({ filename: new URL(\"./worker.mjs\", import.meta.url).href })",
    ],
  },
  {
    library: PISCINA,
    patternKey: "factory:Piscina:*>call:run:*",
    matches: [
      "import { Piscina } from \"piscina\"\nconst piscina = new Piscina({ filename: new URL(\"./worker.mjs\", import.meta.url).href })\nconst result = await piscina.run({ a: 4, b: 6 })",
    ],
    rejects: [
      "const piscina = makeLocalPool()\nconst result = await piscina.run({ a: 4, b: 6 })",
    ],
  },
  {
    library: PISCINA,
    patternKey: "factory:Piscina:*>call:on:*",
    matches: [
      "import { Piscina } from \"piscina\"\nconst piscina = new Piscina({ filename: new URL(\"./worker.mjs\", import.meta.url).href })\npiscina.on(\"drain\", () => { resumeSource() })",
    ],
    rejects: [
      "const piscina = makeLocalPool()\npiscina.on(\"drain\", () => { resumeSource() })",
    ],
  },
  {
    library: PISCINA,
    patternKey: "factory:default:*",
    matches: [
      "const Piscina = require(\"piscina\")\nconst piscina = new Piscina({ filename: path.resolve(__dirname, \"worker.js\") })",
      "import Piscina from \"piscina\"\nconst piscina = new Piscina({ filename: path.resolve(__dirname, \"worker.js\") })",
    ],
    rejects: [
      "const Piscina = makeLocalPool\nconst piscina = new Piscina({ filename: path.resolve(__dirname, \"worker.js\") })",
    ],
  },
  {
    library: PISCINA,
    patternKey: "factory:default:*>call:run:*",
    matches: [
      "const Piscina = require(\"piscina\")\nconst piscina = new Piscina({ filename: path.resolve(__dirname, \"worker.js\") })\nconst result = await piscina.run({ a: 4, b: 6 }, { name: \"add\" })",
    ],
    rejects: [
      "const piscina = makeLocalPool()\nconst result = await piscina.run({ a: 4, b: 6 }, { name: \"add\" })",
    ],
  },
  {
    library: PISCINA,
    patternKey: "factory:default:*>call:on:*",
    matches: [
      "const Piscina = require(\"piscina\")\nconst piscina = new Piscina({ filename: path.resolve(__dirname, \"worker.js\") })\npiscina.on(\"message\", (message) => { report(message) })",
    ],
    rejects: [
      "const piscina = makeLocalPool()\npiscina.on(\"message\", (message) => { report(message) })",
    ],
  },
]

const TINYPOOL = "Tinypool"

export const tinypoolFixtures: readonly PatternFixture[] = [
  {
    library: TINYPOOL,
    patternKey: "factory:Tinypool:*",
    matches: [
      "import { Tinypool } from \"tinypool\"\nconst pool = new Tinypool({ filename: new URL(\"./worker.mjs\", import.meta.url).href })",
    ],
    rejects: [
      "const Tinypool = makeLocalPool\nconst pool = new Tinypool({ filename: new URL(\"./worker.mjs\", import.meta.url).href })",
    ],
  },
  {
    library: TINYPOOL,
    patternKey: "factory:Tinypool:*>call:run:*",
    matches: [
      "import { Tinypool } from \"tinypool\"\nconst pool = new Tinypool({ filename: new URL(\"./worker.mjs\", import.meta.url).href })\nconst result = await pool.run({ a: 4, b: 6 })",
    ],
    rejects: [
      "const pool = makeLocalPool()\nconst result = await pool.run({ a: 4, b: 6 })",
    ],
  },
  {
    library: TINYPOOL,
    patternKey: "factory:Tinypool:*>call:on:*",
    matches: [
      "import { Tinypool } from \"tinypool\"\nconst pool = new Tinypool({ filename: new URL(\"./worker.mjs\", import.meta.url).href })\npool.on(\"error\", (error) => { report(error) })",
    ],
    rejects: [
      "const pool = makeLocalPool()\npool.on(\"error\", (error) => { report(error) })",
    ],
  },
  {
    library: TINYPOOL,
    patternKey: "factory:default:*",
    matches: [
      "import Tinypool from \"tinypool\"\nconst pool = new Tinypool({ filename: new URL(\"./worker.mjs\", import.meta.url).href, runtime: \"child_process\" })",
    ],
    rejects: [
      "const Tinypool = makeLocalPool\nconst pool = new Tinypool({ filename: new URL(\"./worker.mjs\", import.meta.url).href, runtime: \"child_process\" })",
    ],
  },
  {
    library: TINYPOOL,
    patternKey: "factory:default:*>call:run:*",
    matches: [
      "import Tinypool from \"tinypool\"\nconst pool = new Tinypool({ filename: new URL(\"./worker.mjs\", import.meta.url).href })\nconst result = await pool.run({ a: 4, b: 6 })",
    ],
    rejects: [
      "const pool = makeLocalPool()\nconst result = await pool.run({ a: 4, b: 6 })",
    ],
  },
  {
    library: TINYPOOL,
    patternKey: "factory:default:*>call:on:*",
    matches: [
      "import Tinypool from \"tinypool\"\nconst pool = new Tinypool({ filename: new URL(\"./worker.mjs\", import.meta.url).href })\npool.on(\"message\", (message) => { report(message) })",
    ],
    rejects: [
      "const pool = makeLocalPool()\npool.on(\"message\", (message) => { report(message) })",
    ],
  },
]

const WORKERPOOL = "Workerpool"

export const workerpoolFixtures: readonly PatternFixture[] = [
  {
    library: WORKERPOOL,
    patternKey: "factory:pool:*",
    matches: [
      "const workerpool = require(\"workerpool\")\nconst pool = workerpool.pool(__dirname + \"/myWorker.js\")",
      "import { pool } from \"workerpool\"\nconst workers = pool({ maxWorkers: 4 })",
    ],
    rejects: [
      "const workerpool = makeLocalRegistry()\nconst pool = workerpool.pool(__dirname + \"/myWorker.js\")",
    ],
  },
  {
    library: WORKERPOOL,
    patternKey: "factory:pool:*>call:exec:*",
    matches: [
      "const workerpool = require(\"workerpool\")\nconst pool = workerpool.pool(__dirname + \"/myWorker.js\")\nconst result = await pool.exec(\"fibonacci\", [10], { on: (payload) => { report(payload) } })",
    ],
    rejects: [
      "const pool = makeLocalPool()\nconst result = await pool.exec(\"fibonacci\", [10], { on: (payload) => { report(payload) } })",
    ],
  },
  {
    library: WORKERPOOL,
    patternKey: "factory:pool:*>call:proxy:*",
    matches: [
      "const workerpool = require(\"workerpool\")\nconst pool = workerpool.pool(__dirname + \"/myWorker.js\")\nconst worker = await pool.proxy()",
    ],
    rejects: [
      "const pool = makeLocalPool()\nconst worker = await pool.proxy()",
    ],
  },
  {
    library: WORKERPOOL,
    patternKey: "call:worker:*",
    matches: [
      "const workerpool = require(\"workerpool\")\nworkerpool.worker({ fibonacci: (n) => (n < 2 ? n : fibonacci(n - 2) + fibonacci(n - 1)) })",
    ],
    rejects: [
      "const workerpool = makeLocalRegistry()\nworkerpool.worker({ fibonacci: (n) => (n < 2 ? n : fibonacci(n - 2) + fibonacci(n - 1)) })",
    ],
  },
]

const ZX = "zx"

export const zxFixtures: readonly PatternFixture[] = [
  {
    library: ZX,
    patternKey: "call:$:*",
    matches: [
      "import { $ } from \"zx\"\nconst list = await $`ls -la`",
      "import { $ } from \"zx\"\nawait $({ cwd: \"/tmp\" })`pwd`",
    ],
    rejects: [
      "const $ = (...parts) => parts\nconst list = await $`ls -la`",
    ],
  },
  {
    library: ZX,
    patternKey: "call:$.sync:*",
    matches: [
      "import { $ } from \"zx\"\nconst dir = $.sync`pwd`",
    ],
    rejects: [
      "const $ = makeLocalShell()\nconst dir = $.sync`pwd`",
    ],
  },
]
