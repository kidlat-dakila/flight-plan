import type { CallPattern, CatalogueLibrary, Slot } from "@/catalogue/types"

const LISTENER_SLOTS: readonly Slot[] = [{ at: 1, runs: "event" }]

const EVERY_EVENT_LISTENER_SLOTS: readonly Slot[] = [{ at: 0, runs: "event" }]

const EVENTEMITTER3_METHODS: readonly CallPattern[] = [
  { kind: "call", name: "on", slots: LISTENER_SLOTS, eventAt: 0 },
  { kind: "call", name: "addListener", slots: LISTENER_SLOTS, eventAt: 0 },
  { kind: "call", name: "once", slots: LISTENER_SLOTS, eventAt: 0 },
  { kind: "call", name: "emit", slots: [], makes: "publish", eventAt: 0 },
]

const EVENTEMITTER2_COUNTED_LISTENER_SLOTS: readonly Slot[] = [{ at: 2, runs: "event" }]

const EVENTEMITTER2_METHODS: readonly CallPattern[] = [
  { kind: "call", name: "on", slots: LISTENER_SLOTS, eventAt: 0 },
  { kind: "call", name: "addListener", slots: LISTENER_SLOTS, eventAt: 0 },
  { kind: "call", name: "once", slots: LISTENER_SLOTS, eventAt: 0 },
  { kind: "call", name: "prependListener", slots: LISTENER_SLOTS, eventAt: 0 },
  { kind: "call", name: "prependOnceListener", slots: LISTENER_SLOTS, eventAt: 0 },
  { kind: "call", name: "many", slots: EVENTEMITTER2_COUNTED_LISTENER_SLOTS, eventAt: 0 },
  { kind: "call", name: "prependMany", slots: EVENTEMITTER2_COUNTED_LISTENER_SLOTS, eventAt: 0 },
  { kind: "call", name: "onAny", slots: EVERY_EVENT_LISTENER_SLOTS },
  { kind: "call", name: "prependAny", slots: EVERY_EVENT_LISTENER_SLOTS },
  { kind: "call", name: "emit", slots: [], makes: "publish", eventAt: 0 },
  { kind: "call", name: "emitAsync", slots: [], makes: "publish", eventAt: 0 },
]

export const mittLibrary: CatalogueLibrary = {
  name: "Mitt",
  specifiers: ["mitt"],
  documentedVersion: "3.0",
  category: "event-emitters",
  type: "fullstack",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "default",
      methods: [
        { kind: "call", name: "on", slots: LISTENER_SLOTS, eventAt: 0 },
        { kind: "call", name: "emit", slots: [], makes: "publish", eventAt: 0 },
      ],
    },
  ],
}

export const eventemitter3Library: CatalogueLibrary = {
  name: "EventEmitter3",
  specifiers: ["eventemitter3"],
  documentedVersion: "5.0",
  category: "event-emitters",
  type: "fullstack",
  language: "javascript",
  patterns: [
    { kind: "factory", name: "default", methods: EVENTEMITTER3_METHODS },
    { kind: "factory", name: "EventEmitter", methods: EVENTEMITTER3_METHODS },
  ],
}

export const emitteryLibrary: CatalogueLibrary = {
  name: "Emittery",
  specifiers: ["emittery"],
  documentedVersion: "2.1",
  category: "event-emitters",
  type: "fullstack",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "default",
      methods: [
        { kind: "call", name: "on", slots: LISTENER_SLOTS, eventAt: 0 },
        { kind: "call", name: "onAny", slots: EVERY_EVENT_LISTENER_SLOTS },
        { kind: "call", name: "emit", slots: [], makes: "publish", eventAt: 0 },
        { kind: "call", name: "emitSerial", slots: [], makes: "publish", eventAt: 0 },
      ],
    },
  ],
}

export const nanoEventsLibrary: CatalogueLibrary = {
  name: "Nano Events",
  specifiers: ["nanoevents"],
  documentedVersion: "10.0",
  category: "event-emitters",
  type: "fullstack",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "createNanoEvents",
      methods: [
        { kind: "call", name: "on", slots: LISTENER_SLOTS, eventAt: 0 },
        { kind: "call", name: "emit", slots: [], makes: "publish", eventAt: 0 },
      ],
    },
  ],
}

export const eventemitter2Library: CatalogueLibrary = {
  name: "EventEmitter2",
  specifiers: ["eventemitter2"],
  documentedVersion: "6.4",
  category: "event-emitters",
  type: "fullstack",
  language: "javascript",
  patterns: [
    { kind: "factory", name: "default", methods: EVENTEMITTER2_METHODS },
    { kind: "factory", name: "EventEmitter2", methods: EVENTEMITTER2_METHODS },
  ],
}
