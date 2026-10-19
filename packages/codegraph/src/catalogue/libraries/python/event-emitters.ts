import type { CatalogueLibrary, MethodPattern, Slot } from "@/catalogue/types"

const PYEE_LISTENER_SLOTS: readonly Slot[] = [{ at: [1, "f"], runs: "event" }]

const BLINKER_SIGNAL_METHODS: readonly MethodPattern[] = [
  { kind: "call", name: "connect", slots: [{ at: [0, "receiver"], runs: "event" }] },
  { kind: "decorator", name: "connect", runs: "event" },
  { kind: "decorator", name: "connect_via", runs: "event" },
  { kind: "call", name: "send", slots: [], makes: "publish" },
  { kind: "call", name: "send_async", slots: [], makes: "publish" },
]

const PYEE_EMITTER_METHODS: readonly MethodPattern[] = [
  { kind: "call", name: "on", slots: PYEE_LISTENER_SLOTS, eventAt: [0, "event"] },
  { kind: "decorator", name: "on", runs: "event", eventAt: [0, "event"] },
  { kind: "call", name: "once", slots: PYEE_LISTENER_SLOTS, eventAt: [0, "event"] },
  { kind: "decorator", name: "once", runs: "event", eventAt: [0, "event"] },
  { kind: "call", name: "add_listener", slots: PYEE_LISTENER_SLOTS, eventAt: [0, "event"] },
  { kind: "decorator", name: "listens_to", runs: "event", eventAt: [0, "event"] },
  { kind: "call", name: "emit", slots: [], makes: "publish", eventAt: [0, "event"] },
]

export const blinkerLibrary: CatalogueLibrary = {
  name: "blinker",
  specifiers: ["blinker"],
  documentedVersion: "1.9",
  category: "event-emitters",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "factory", name: "signal", methods: BLINKER_SIGNAL_METHODS },
    { kind: "factory", name: "Signal", methods: BLINKER_SIGNAL_METHODS },
    { kind: "factory", name: "NamedSignal", methods: BLINKER_SIGNAL_METHODS },
    {
      kind: "factory",
      name: "Namespace",
      methods: [{ kind: "factory", name: "signal", methods: BLINKER_SIGNAL_METHODS }],
    },
  ],
}

export const pyeeLibrary: CatalogueLibrary = {
  name: "pyee",
  specifiers: ["pyee", "pyee.base", "pyee.asyncio", "pyee.executor", "pyee.twisted", "pyee.trio"],
  documentedVersion: "15.0",
  category: "event-emitters",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "factory", name: "EventEmitter", methods: PYEE_EMITTER_METHODS },
    { kind: "factory", name: "AsyncIOEventEmitter", methods: PYEE_EMITTER_METHODS },
    { kind: "factory", name: "ExecutorEventEmitter", methods: PYEE_EMITTER_METHODS },
    { kind: "factory", name: "TwistedEventEmitter", methods: PYEE_EMITTER_METHODS },
    { kind: "factory", name: "TrioEventEmitter", methods: PYEE_EMITTER_METHODS },
  ],
}

export const zopeEventLibrary: CatalogueLibrary = {
  name: "zope.event",
  specifiers: ["zope.event", "zope.event.classhandler"],
  documentedVersion: "6.2",
  category: "event-emitters",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "call", name: "notify", slots: [], makes: "publish", eventAt: 0 },
    { kind: "call", name: "subscribers.append", slots: [{ at: 0, runs: "event" }] },
    { kind: "call", name: "handler", slots: [{ at: 1, runs: "event" }], eventAt: 0 },
    { kind: "decorator", name: "handler", runs: "event", eventAt: 0 },
  ],
}

export const pyDispatcherLibrary: CatalogueLibrary = {
  name: "PyDispatcher",
  specifiers: ["pydispatch"],
  documentedVersion: "2.0",
  category: "event-emitters",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "call", name: "dispatcher.connect", slots: [{ at: [0, "receiver"], runs: "event" }], eventAt: [1, "signal"] },
    { kind: "call", name: "dispatcher.send", slots: [], makes: "publish", eventAt: [0, "signal"] },
    { kind: "call", name: "dispatcher.sendExact", slots: [], makes: "publish", eventAt: [0, "signal"] },
  ],
}

export const observableLibrary: CatalogueLibrary = {
  name: "observable",
  specifiers: ["observable"],
  documentedVersion: "1.0",
  category: "event-emitters",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "Observable",
      methods: [
        { kind: "call", name: "on", slots: [{ at: 1, runs: "event" }], eventAt: 0 },
        { kind: "decorator", name: "on", runs: "event", eventAt: 0 },
        { kind: "call", name: "once", slots: [{ at: 1, runs: "event" }], eventAt: 0 },
        { kind: "decorator", name: "once", runs: "event", eventAt: 0 },
        { kind: "call", name: "trigger", slots: [], makes: "publish", eventAt: 0 },
      ],
    },
  ],
}
