import type { MethodPattern } from "@/catalogue/types"
import type { Library } from "@/code-blocks/libraries/types"

const FIRST_ARGUMENT = 0

const SECOND_ARGUMENT = 1

const LAST_ARGUMENT = "last"

const PROCESS_EXECUTION = "process-execution"

const NODE_DOCUMENTED_VERSION = "26.12"

const LISTENER_METHODS: readonly MethodPattern[] = [
  { kind: "call", name: "on", slots: [{ at: SECOND_ARGUMENT, runs: "event" }], eventAt: FIRST_ARGUMENT },
  { kind: "call", name: "once", slots: [{ at: SECOND_ARGUMENT, runs: "event" }], eventAt: FIRST_ARGUMENT },
]

export const nodeChildProcessLibrary: Library = {
  name: "Node.js child_process",
  specifiers: ["child_process", "node:child_process"],
  documentedVersion: NODE_DOCUMENTED_VERSION,
  category: "processes",
  type: "backend",
  language: "javascript",
  patterns: [
    { kind: "factory", name: "spawn", classifies: PROCESS_EXECUTION, methods: LISTENER_METHODS },
    { kind: "factory", name: "fork", classifies: PROCESS_EXECUTION, methods: LISTENER_METHODS },
    { kind: "factory", name: "exec", classifies: PROCESS_EXECUTION, slots: [{ at: LAST_ARGUMENT, runs: "event" }], methods: LISTENER_METHODS },
    { kind: "factory", name: "execFile", classifies: PROCESS_EXECUTION, slots: [{ at: LAST_ARGUMENT, runs: "event" }], methods: LISTENER_METHODS },
    { kind: "call", name: "execSync", slots: [], classifies: PROCESS_EXECUTION },
    { kind: "call", name: "execFileSync", slots: [], classifies: PROCESS_EXECUTION },
    { kind: "call", name: "spawnSync", slots: [], classifies: PROCESS_EXECUTION },
  ],
}

export const nodeWorkerThreadsLibrary: Library = {
  name: "Node.js worker_threads",
  specifiers: ["worker_threads", "node:worker_threads"],
  documentedVersion: NODE_DOCUMENTED_VERSION,
  category: "processes",
  type: "backend",
  language: "javascript",
  patterns: [
    { kind: "factory", name: "Worker", classifies: PROCESS_EXECUTION, methods: LISTENER_METHODS },
    { kind: "call", name: "parentPort.on", slots: [{ at: SECOND_ARGUMENT, runs: "event" }], eventAt: FIRST_ARGUMENT },
    { kind: "call", name: "parentPort.once", slots: [{ at: SECOND_ARGUMENT, runs: "event" }], eventAt: FIRST_ARGUMENT },
  ],
}
