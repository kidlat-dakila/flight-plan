import type { CatalogueLibrary, Slot } from "@/catalogue/types"

const TENACITY_CALLBACK_SLOTS: readonly Slot[] = [
  { at: "before", runs: "event" },
  { at: "after", runs: "event" },
  { at: "before_sleep", runs: "event" },
  { at: "retry_error_callback", runs: "event" },
]

const BACKOFF_HANDLER_SLOTS: readonly Slot[] = [
  { at: "giveup", runs: "event" },
  { at: "on_success", runs: "event" },
  { at: "on_backoff", runs: "event" },
  { at: "on_giveup", runs: "event" },
]

export const returnsLibrary: CatalogueLibrary = {
  name: "returns",
  specifiers: ["returns.result", "returns.future"],
  documentedVersion: "0.29",
  category: "error-handling",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "decorator", name: "safe", classifies: "error-handling" },
    { kind: "decorator", name: "attempt", classifies: "error-handling" },
    { kind: "decorator", name: "future_safe", classifies: "error-handling" },
    { kind: "call", name: "Failure", slots: [], classifies: "error-handling" },
  ],
}

export const tenacityLibrary: CatalogueLibrary = {
  name: "Tenacity",
  specifiers: ["tenacity"],
  documentedVersion: "9.2",
  category: "error-handling",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "decorator", name: "retry", slots: TENACITY_CALLBACK_SLOTS },
    {
      kind: "factory",
      name: "Retrying",
      slots: TENACITY_CALLBACK_SLOTS,
      methods: [],
      called: {
        slots: [{ at: 0, runs: "in-place" }],
      },
    },
    { kind: "factory", name: "AsyncRetrying", slots: TENACITY_CALLBACK_SLOTS, methods: [] },
  ],
}

export const backoffLibrary: CatalogueLibrary = {
  name: "backoff",
  specifiers: ["backoff"],
  documentedVersion: "2.2",
  category: "error-handling",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "decorator", name: "on_exception", slots: BACKOFF_HANDLER_SLOTS },
    { kind: "decorator", name: "on_predicate", slots: BACKOFF_HANDLER_SLOTS },
  ],
}

export const pyBreakerLibrary: CatalogueLibrary = {
  name: "PyBreaker",
  specifiers: ["pybreaker"],
  documentedVersion: "1.4",
  category: "error-handling",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "CircuitBreaker",
      classifies: "error-handling",
      methods: [
        { kind: "call", name: "call", slots: [{ at: 0, runs: "in-place" }] },
        { kind: "call", name: "call_async", slots: [{ at: 0, runs: "in-place" }] },
        { kind: "call", name: "calling", slots: [], classifies: "error-handling" },
      ],
    },
    {
      kind: "class",
      name: "CircuitBreakerListener",
      members: [
        { name: "before_call", runs: "event" },
        { name: "state_change", runs: "event" },
        { name: "failure", runs: "event" },
        { name: "success", runs: "event" },
      ],
      methods: [],
    },
  ],
}

export const retryLibrary: CatalogueLibrary = {
  name: "retry",
  specifiers: ["retry", "retry.api"],
  documentedVersion: "0.9",
  category: "error-handling",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "decorator", name: "retry", classifies: "error-handling" },
    { kind: "call", name: "retry_call", slots: [{ at: [0, "f"], runs: "in-place" }] },
  ],
}
