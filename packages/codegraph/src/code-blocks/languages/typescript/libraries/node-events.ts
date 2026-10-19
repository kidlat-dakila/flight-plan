import type { CallPattern, Slot } from "@/catalogue/types"
import type { Library } from "@/code-blocks/libraries/types"

const NODE_EVENTS_LISTENER_SLOTS: readonly Slot[] = [{ at: 1, runs: "event" }]

const NODE_EVENTS_EMITTER_METHODS: readonly CallPattern[] = [
  { kind: "call", name: "on", slots: NODE_EVENTS_LISTENER_SLOTS, eventAt: 0 },
  { kind: "call", name: "addListener", slots: NODE_EVENTS_LISTENER_SLOTS, eventAt: 0 },
  { kind: "call", name: "once", slots: NODE_EVENTS_LISTENER_SLOTS, eventAt: 0 },
  { kind: "call", name: "prependListener", slots: NODE_EVENTS_LISTENER_SLOTS, eventAt: 0 },
  { kind: "call", name: "prependOnceListener", slots: NODE_EVENTS_LISTENER_SLOTS, eventAt: 0 },
  { kind: "call", name: "emit", slots: [], makes: "publish", eventAt: 0 },
]

export const nodeEventsLibrary: Library = {
  name: "Node.js events",
  specifiers: ["events", "node:events"],
  documentedVersion: "24",
  category: "event-emitters",
  type: "backend",
  language: "javascript",
  patterns: [
    { kind: "factory", name: "EventEmitter", methods: NODE_EVENTS_EMITTER_METHODS },
    { kind: "factory", name: "default", methods: NODE_EVENTS_EMITTER_METHODS },
    { kind: "class", name: "EventEmitter", members: [], methods: NODE_EVENTS_EMITTER_METHODS },
    { kind: "class", name: "default", members: [], methods: NODE_EVENTS_EMITTER_METHODS },
  ],
}
