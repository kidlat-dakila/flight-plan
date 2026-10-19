import type { PatternFixture } from "@/catalogue/types"

const NODE_EVENTS = "Node.js events"

const NODE_EVENTS_LOCAL_EMITTER = "const emitter = makeLocalRegistry()"

const NODE_EVENTS_LISTENER = "(order) => { sendReceipt(order) }"

interface NodeEventsEmitter {
  readonly key: string
  readonly made: string
  readonly local: string
}

const NODE_EVENTS_EMITTERS: readonly NodeEventsEmitter[] = [
  {
    key: "factory:EventEmitter:*",
    made: "import { EventEmitter } from \"node:events\"\nconst emitter = new EventEmitter()",
    local: "class EventEmitter {}\nconst emitter = new EventEmitter()",
  },
  {
    key: "factory:default:*",
    made: "const EventEmitter = require(\"events\")\nconst emitter = new EventEmitter()",
    local: "class EventEmitter {}\nconst emitter = new EventEmitter()",
  },
  {
    key: "class:EventEmitter:*",
    made: "import { EventEmitter } from \"node:events\"\nclass OrderEvents extends EventEmitter {}\nconst emitter = new OrderEvents()",
    local: "class EventEmitter {}\nclass OrderEvents extends EventEmitter {}\nconst emitter = new OrderEvents()",
  },
  {
    key: "class:default:*",
    made: "const EventEmitter = require(\"node:events\")\nclass OrderEvents extends EventEmitter {}\nconst emitter = new OrderEvents()",
    local: "class EventEmitter {}\nclass OrderEvents extends EventEmitter {}\nconst emitter = new OrderEvents()",
  },
]

const NODE_EVENTS_METHOD_CALLS: readonly (readonly [string, string])[] = [
  ["on", `emitter.on("order-placed", ${NODE_EVENTS_LISTENER})`],
  ["addListener", `emitter.addListener("order-placed", ${NODE_EVENTS_LISTENER})`],
  ["once", `emitter.once("order-placed", ${NODE_EVENTS_LISTENER})`],
  ["prependListener", `emitter.prependListener("order-placed", ${NODE_EVENTS_LISTENER})`],
  ["prependOnceListener", `emitter.prependOnceListener("order-placed", ${NODE_EVENTS_LISTENER})`],
  ["emit", "emitter.emit(\"order-placed\", { id: 42 })"],
]

const nodeEventsFixturesOf = ({ key, made, local }: NodeEventsEmitter): PatternFixture[] => [
  { library: NODE_EVENTS, patternKey: key, matches: [made], rejects: [local] },
  ...NODE_EVENTS_METHOD_CALLS.map(([name, call]) => ({
    library: NODE_EVENTS,
    patternKey: `${key}>call:${name}:*`,
    matches: [`${made}\n${call}`],
    rejects: [`${NODE_EVENTS_LOCAL_EMITTER}\n${call}`],
  })),
]

export const nodeEventsFixtures: readonly PatternFixture[] = NODE_EVENTS_EMITTERS.flatMap(nodeEventsFixturesOf)
