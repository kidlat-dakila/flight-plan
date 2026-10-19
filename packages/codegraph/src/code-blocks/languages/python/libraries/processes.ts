import type { Slot, SlotPosition } from "@/catalogue/types"
import type { Library } from "@/code-blocks/libraries/types"

const PROCESS_EXECUTION = "process-execution"

const PYTHON_DOCUMENTED_VERSION = "3.14"

const MULTIPROCESSING_FUNCTION: SlotPosition = [0, "func"]

const MULTIPROCESSING_IN_PLACE_SLOTS: readonly Slot[] = [{ at: MULTIPROCESSING_FUNCTION, runs: "in-place" }]

const MULTIPROCESSING_ASYNC_SLOTS: readonly Slot[] = [
  { at: MULTIPROCESSING_FUNCTION, runs: "effect" },
  { at: "callback", runs: "event" },
  { at: "error_callback", runs: "event" },
]

export const subprocessLibrary: Library = {
  name: "subprocess",
  specifiers: ["subprocess"],
  documentedVersion: PYTHON_DOCUMENTED_VERSION,
  category: "processes",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "call", name: "run", slots: [], classifies: PROCESS_EXECUTION },
    { kind: "call", name: "Popen", slots: [], classifies: PROCESS_EXECUTION },
    { kind: "call", name: "call", slots: [], classifies: PROCESS_EXECUTION },
    { kind: "call", name: "check_call", slots: [], classifies: PROCESS_EXECUTION },
    { kind: "call", name: "check_output", slots: [], classifies: PROCESS_EXECUTION },
  ],
}

export const multiprocessingLibrary: Library = {
  name: "multiprocessing",
  specifiers: ["multiprocessing"],
  documentedVersion: PYTHON_DOCUMENTED_VERSION,
  category: "processes",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "call", name: "Process", slots: [], classifies: PROCESS_EXECUTION },
    {
      kind: "factory",
      name: "Pool",
      classifies: PROCESS_EXECUTION,
      methods: [
        { kind: "call", name: "apply", slots: MULTIPROCESSING_IN_PLACE_SLOTS },
        { kind: "call", name: "map", slots: MULTIPROCESSING_IN_PLACE_SLOTS },
        { kind: "call", name: "imap", slots: MULTIPROCESSING_IN_PLACE_SLOTS },
        { kind: "call", name: "imap_unordered", slots: MULTIPROCESSING_IN_PLACE_SLOTS },
        { kind: "call", name: "starmap", slots: MULTIPROCESSING_IN_PLACE_SLOTS },
        { kind: "call", name: "apply_async", slots: MULTIPROCESSING_ASYNC_SLOTS },
        { kind: "call", name: "map_async", slots: MULTIPROCESSING_ASYNC_SLOTS },
        { kind: "call", name: "starmap_async", slots: MULTIPROCESSING_ASYNC_SLOTS },
      ],
    },
  ],
}
