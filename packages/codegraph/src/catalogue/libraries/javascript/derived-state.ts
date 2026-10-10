import type { CatalogueLibrary } from "@/catalogue/types"

export const alienSignalsLibrary: CatalogueLibrary = {
  name: "alien-signals",
  specifiers: ["alien-signals"],
  documentedVersion: "3.2",
  category: "derived-state",
  type: "frontend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "signal", slots: [], makes: "state" },
    { kind: "call", name: "computed", slots: [{ at: 0, runs: "in-place" }], makes: "derived" },
    { kind: "call", name: "effect", slots: [{ at: 0, runs: "effect" }] },
    { kind: "call", name: "effectScope", slots: [{ at: 0, runs: "in-place" }] },
  ],
}

export const reatomLibrary: CatalogueLibrary = {
  name: "Reatom",
  specifiers: ["@reatom/core"],
  documentedVersion: "1001.3",
  category: "derived-state",
  type: "frontend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "atom", slots: [], makes: "state" },
    { kind: "call", name: "computed", slots: [{ at: 0, runs: "in-place" }], makes: "derived" },
    { kind: "call", name: "action", slots: [{ at: 0, runs: "kept" }] },
    { kind: "call", name: "effect", slots: [{ at: 0, runs: "effect" }] },
  ],
}

export const reselectLibrary: CatalogueLibrary = {
  name: "Reselect",
  specifiers: ["reselect"],
  documentedVersion: "5.3",
  category: "derived-state",
  type: "frontend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "createSelector", slots: [{ at: "last", runs: "in-place" }], makes: "derived" },
    { kind: "call", name: "createStructuredSelector", slots: [], makes: "derived" },
    {
      kind: "factory",
      name: "createSelectorCreator",
      methods: [],
      called: {
        slots: [{ at: "last", runs: "in-place" }],
        makes: "derived",
      },
    },
  ],
}

export const rxjsLibrary: CatalogueLibrary = {
  name: "RxJS",
  specifiers: ["rxjs", "rxjs/operators"],
  documentedVersion: "7.8",
  category: "derived-state",
  type: "frontend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "Subject",
      methods: [
        { kind: "call", name: "next", slots: [], makes: "publish" },
        { kind: "call", name: "subscribe", slots: [{ at: 0, runs: "event" }, { at: "next", runs: "event" }] },
      ],
    },
    {
      kind: "factory",
      name: "BehaviorSubject",
      makes: "state",
      methods: [
        { kind: "call", name: "next", slots: [], makes: "publish" },
        { kind: "call", name: "subscribe", slots: [{ at: 0, runs: "event" }, { at: "next", runs: "event" }] },
      ],
    },
    {
      kind: "factory",
      name: "fromEvent",
      methods: [
        { kind: "call", name: "subscribe", slots: [{ at: 0, runs: "event" }, { at: "next", runs: "event" }] },
      ],
    },
    { kind: "call", name: "map", slots: [{ at: 0, runs: "kept" }], makes: "derived" },
    { kind: "call", name: "filter", slots: [{ at: 0, runs: "kept" }], makes: "derived" },
  ],
}

export const signalsLibrary: CatalogueLibrary = {
  name: "Signals",
  specifiers: ["@preact/signals-core", "@preact/signals-react"],
  documentedVersion: "1.14",
  category: "derived-state",
  type: "frontend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "signal", slots: [], makes: "state" },
    { kind: "call", name: "computed", slots: [{ at: 0, runs: "in-place" }], makes: "derived" },
    { kind: "call", name: "effect", slots: [{ at: 0, runs: "effect" }] },
    { kind: "call", name: "batch", slots: [{ at: 0, runs: "in-place" }] },
    { kind: "call", name: "useSignal", slots: [], makes: "state" },
    { kind: "call", name: "useComputed", slots: [{ at: 0, runs: "in-place" }], makes: "derived" },
    { kind: "call", name: "useSignalEffect", slots: [{ at: 0, runs: "effect" }] },
  ],
}
