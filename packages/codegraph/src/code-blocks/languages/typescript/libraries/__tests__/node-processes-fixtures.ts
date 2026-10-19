import type { PatternFixture } from "@/catalogue/types"

const NODE_CHILD_PROCESS = "Node.js child_process"

const NODE_WORKER_THREADS = "Node.js worker_threads"

const NODE_LISTENER_NAMES: readonly string[] = ["on", "once"]

const NODE_LOCAL_CHILD = "const child = makeLocalRegistry()"

interface NodeChildFactory {
  readonly name: string
  readonly made: string
  readonly required: string
  readonly call: string
}

const NODE_CHILD_FACTORIES: readonly NodeChildFactory[] = [
  {
    name: "spawn",
    made: "import { spawn } from \"node:child_process\"\nconst child = spawn(\"ls\", [\"-lh\", \"/usr\"])",
    required: "const { spawn } = require(\"child_process\")\nconst child = spawn(\"ls\", [\"-lh\", \"/usr\"])",
    call: "spawn(\"ls\", [\"-lh\", \"/usr\"])",
  },
  {
    name: "fork",
    made: "import { fork } from \"node:child_process\"\nconst child = fork(\"./worker.js\", [\"child\"])",
    required: "const childProcess = require(\"child_process\")\nconst child = childProcess.fork(\"./worker.js\", [\"child\"])",
    call: "fork(\"./worker.js\", [\"child\"])",
  },
  {
    name: "exec",
    made: "import { exec } from \"node:child_process\"\nconst child = exec(\"cat *.js missing_file | wc -l\", (error, stdout, stderr) => { report(stdout) })",
    required: "const { exec } = require(\"child_process\")\nconst child = exec(\"cat *.js missing_file | wc -l\", (error, stdout, stderr) => { report(stdout) })",
    call: "exec(\"cat *.js missing_file | wc -l\", (error, stdout, stderr) => { report(stdout) })",
  },
  {
    name: "execFile",
    made: "import { execFile } from \"node:child_process\"\nconst child = execFile(\"node\", [\"--version\"], (error, stdout, stderr) => { report(stdout) })",
    required: "const { execFile } = require(\"child_process\")\nconst child = execFile(\"node\", [\"--version\"], (error, stdout, stderr) => { report(stdout) })",
    call: "execFile(\"node\", [\"--version\"], (error, stdout, stderr) => { report(stdout) })",
  },
]

const nodeChildFactoryFixtures = ({ name, made, required, call }: NodeChildFactory): PatternFixture[] => [
  {
    library: NODE_CHILD_PROCESS,
    patternKey: `factory:${name}:*`,
    matches: [made, required],
    rejects: [`const ${name} = (...parts) => parts\nconst child = ${call}`],
  },
  ...NODE_LISTENER_NAMES.map((listener) => ({
    library: NODE_CHILD_PROCESS,
    patternKey: `factory:${name}:*>call:${listener}:*`,
    matches: [`${made}\nchild.${listener}("close", (code) => { report(code) })`, `${made}\nchild.stdout.${listener}("data", (data) => { report(data) })`],
    rejects: [`${NODE_LOCAL_CHILD}\nchild.${listener}("close", (code) => { report(code) })`],
  })),
]

const nodeSyncCallFixture = (name: string, call: string): PatternFixture => ({
  library: NODE_CHILD_PROCESS,
  patternKey: `call:${name}:*`,
  matches: [`import { ${name} } from "node:child_process"\nconst output = ${call}`, `const childProcess = require("child_process")\nconst output = childProcess.${call}`],
  rejects: [`const ${name} = (...parts) => parts\nconst output = ${call}`],
})

const NODE_WORKER = "import { Worker } from \"node:worker_threads\"\nconst worker = new Worker(new URL(\"./worker.js\", import.meta.url), { workerData: script })"

export const nodeChildProcessFixtures: readonly PatternFixture[] = [
  ...NODE_CHILD_FACTORIES.flatMap(nodeChildFactoryFixtures),
  nodeSyncCallFixture("execSync", "execSync(\"git rev-parse HEAD\", { encoding: \"utf8\" })"),
  nodeSyncCallFixture("execFileSync", "execFileSync(\"git\", [\"rev-parse\", \"HEAD\"])"),
  nodeSyncCallFixture("spawnSync", "spawnSync(\"ls\", [\"-lh\", \"/usr\"])"),
]

export const nodeWorkerThreadsFixtures: readonly PatternFixture[] = [
  {
    library: NODE_WORKER_THREADS,
    patternKey: "factory:Worker:*",
    matches: [NODE_WORKER, "const { Worker } = require(\"worker_threads\")\nconst worker = new Worker(__filename, { workerData: script })"],
    rejects: ["const Worker = makeLocalRegistry\nconst worker = new Worker(__filename, { workerData: script })"],
  },
  ...NODE_LISTENER_NAMES.map((listener) => ({
    library: NODE_WORKER_THREADS,
    patternKey: `factory:Worker:*>call:${listener}:*`,
    matches: [`${NODE_WORKER}\nworker.${listener}("message", (message) => { report(message) })`],
    rejects: [`const worker = makeLocalRegistry()\nworker.${listener}("message", (message) => { report(message) })`],
  })),
  ...NODE_LISTENER_NAMES.map((listener) => ({
    library: NODE_WORKER_THREADS,
    patternKey: `call:parentPort.${listener}:*`,
    matches: [`import { parentPort } from "node:worker_threads"\nparentPort.${listener}("message", (task) => { parentPort.postMessage(run(task)) })`],
    rejects: [`const parentPort = makeLocalRegistry()\nparentPort.${listener}("message", (task) => { parentPort.postMessage(run(task)) })`],
  })),
]
