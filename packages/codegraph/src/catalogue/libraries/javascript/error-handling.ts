import type { CatalogueLibrary, Slot } from "@/catalogue/types"

const NEVERTHROW_THROWABLE_SLOTS: readonly Slot[] = [{ at: 0, runs: "kept" }, { at: 1, runs: "event" }]

export const reactErrorBoundaryLibrary: CatalogueLibrary = {
  name: "react-error-boundary",
  specifiers: ["react-error-boundary"],
  documentedVersion: "6.1",
  category: "error-handling",
  type: "frontend",
  language: "javascript",
  patterns: [
    { kind: "element", name: "ErrorBoundary", slots: [{ at: "fallbackRender", runs: "event" }, { at: "FallbackComponent", runs: "event" }] },
    { kind: "call", name: "useErrorBoundary", slots: [], classifies: "error-handling" },
    { kind: "call", name: "withErrorBoundary", slots: [{ at: 0, runs: "kept" }, { at: "1.fallbackRender", runs: "event" }, { at: "1.FallbackComponent", runs: "event" }] },
  ],
}

export const neverThrowLibrary: CatalogueLibrary = {
  name: "NeverThrow",
  specifiers: ["neverthrow"],
  documentedVersion: "8.2",
  category: "error-handling",
  type: "fullstack",
  language: "javascript",
  patterns: [
    { kind: "call", name: "err", slots: [], classifies: "error-handling" },
    { kind: "call", name: "errAsync", slots: [], classifies: "error-handling" },
    { kind: "call", name: "fromThrowable", slots: NEVERTHROW_THROWABLE_SLOTS },
    { kind: "call", name: "fromAsyncThrowable", slots: NEVERTHROW_THROWABLE_SLOTS },
    { kind: "call", name: "fromPromise", slots: [{ at: 1, runs: "event" }] },
    { kind: "call", name: "safeTry", slots: [{ at: 0, runs: "in-place" }] },
    { kind: "call", name: "Result.fromThrowable", slots: NEVERTHROW_THROWABLE_SLOTS },
    { kind: "call", name: "ResultAsync.fromThrowable", slots: NEVERTHROW_THROWABLE_SLOTS },
    { kind: "call", name: "ResultAsync.fromPromise", slots: [{ at: 1, runs: "event" }] },
  ],
}

export const betterResultLibrary: CatalogueLibrary = {
  name: "better-result",
  specifiers: ["better-result"],
  documentedVersion: "3.0",
  category: "error-handling",
  type: "fullstack",
  language: "javascript",
  patterns: [
    { kind: "call", name: "Result.try", slots: [{ at: 0, runs: "in-place" }, { at: "0.try", runs: "in-place" }, { at: "0.catch", runs: "in-place" }] },
    { kind: "call", name: "Result.tryPromise", slots: [{ at: 0, runs: "in-place" }, { at: "0.try", runs: "in-place" }, { at: "0.catch", runs: "event" }] },
    { kind: "call", name: "Result.gen", slots: [{ at: 0, runs: "in-place" }] },
    { kind: "call", name: "Result.err", slots: [], classifies: "error-handling" },
    { kind: "call", name: "TaggedError", slots: [], classifies: "error-handling" },
  ],
}

export const opossumLibrary: CatalogueLibrary = {
  name: "Opossum",
  specifiers: ["opossum"],
  documentedVersion: "10.0",
  category: "error-handling",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "default",
      slots: [{ at: 0, runs: "kept" }],
      methods: [
        { kind: "call", name: "fire", slots: [], classifies: "error-handling" },
        { kind: "call", name: "fallback", slots: [{ at: 0, runs: "event" }] },
        { kind: "call", name: "on", slots: [{ at: 1, runs: "event" }], eventAt: 0 },
      ],
    },
  ],
}

export const trueMythLibrary: CatalogueLibrary = {
  name: "True Myth",
  specifiers: ["true-myth/result", "true-myth/task"],
  documentedVersion: "9.4",
  category: "error-handling",
  type: "fullstack",
  language: "javascript",
  patterns: [
    { kind: "call", name: "tryOrElse", from: "true-myth/result", slots: [{ at: 0, runs: "in-place" }, { at: 1, runs: "in-place" }] },
    { kind: "call", name: "safe", from: "true-myth/result", slots: [{ at: 0, runs: "kept" }] },
    { kind: "call", name: "default.tryOrElse", from: "true-myth/task", slots: [{ at: 1, runs: "event" }] },
  ],
}
