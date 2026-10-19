import type { PatternFixture } from "@/catalogue/types"

const LOCAL_EMITTER = "const emitter = makeLocalRegistry()"

const LISTENER = "(order) => { sendReceipt(order) }"

interface MadeEmitter {
  readonly library: string
  readonly factoryKey: string
  readonly made: string
}

const factoryFixture = ({ library, factoryKey, made }: MadeEmitter, local: string): PatternFixture => ({
  library,
  patternKey: factoryKey,
  matches: [made],
  rejects: [local],
})

const methodFixture = ({ library, factoryKey, made }: MadeEmitter, name: string, call: string): PatternFixture => ({
  library,
  patternKey: `${factoryKey}>call:${name}:*`,
  matches: [`${made}\n${call}`],
  rejects: [`${LOCAL_EMITTER}\n${call}`],
})

const MITT = "Mitt"

const MITT_EMITTER: MadeEmitter = {
  library: MITT,
  factoryKey: "factory:default:*",
  made: "import mitt from \"mitt\"\nconst emitter = mitt()",
}

export const mittFixtures: readonly PatternFixture[] = [
  factoryFixture(MITT_EMITTER, "const mitt = () => ({})\nconst emitter = mitt()"),
  methodFixture(MITT_EMITTER, "on", `emitter.on("order-placed", ${LISTENER})`),
  methodFixture(MITT_EMITTER, "emit", "emitter.emit(\"order-placed\", { id: 42 })"),
]

const EVENTEMITTER3 = "EventEmitter3"

const EVENTEMITTER3_DEFAULT: MadeEmitter = {
  library: EVENTEMITTER3,
  factoryKey: "factory:default:*",
  made: "const EventEmitter = require(\"eventemitter3\")\nconst emitter = new EventEmitter()",
}

const EVENTEMITTER3_NAMED: MadeEmitter = {
  library: EVENTEMITTER3,
  factoryKey: "factory:EventEmitter:*",
  made: "import { EventEmitter } from \"eventemitter3\"\nconst emitter = new EventEmitter()",
}

const eventemitter3MethodFixtures = (emitter: MadeEmitter): PatternFixture[] => [
  factoryFixture(emitter, "class EventEmitter {}\nconst emitter = new EventEmitter()"),
  methodFixture(emitter, "on", `emitter.on("order-placed", ${LISTENER})`),
  methodFixture(emitter, "addListener", `emitter.addListener("order-placed", ${LISTENER})`),
  methodFixture(emitter, "once", `emitter.once("order-placed", ${LISTENER})`),
  methodFixture(emitter, "emit", "emitter.emit(\"order-placed\", { id: 42 })"),
]

export const eventemitter3Fixtures: readonly PatternFixture[] = [
  ...eventemitter3MethodFixtures(EVENTEMITTER3_DEFAULT),
  ...eventemitter3MethodFixtures(EVENTEMITTER3_NAMED),
]

const EMITTERY = "Emittery"

const EMITTERY_EMITTER: MadeEmitter = {
  library: EMITTERY,
  factoryKey: "factory:default:*",
  made: "import Emittery from \"emittery\"\nconst emitter = new Emittery()",
}

export const emitteryFixtures: readonly PatternFixture[] = [
  factoryFixture(EMITTERY_EMITTER, "class Emittery {}\nconst emitter = new Emittery()"),
  methodFixture(EMITTERY_EMITTER, "on", "emitter.on(\"order-placed\", ({ data }) => { sendReceipt(data) })"),
  methodFixture(EMITTERY_EMITTER, "onAny", "emitter.onAny(({ name, data }) => { audit(name, data) })"),
  methodFixture(EMITTERY_EMITTER, "emit", "await emitter.emit(\"order-placed\", { id: 42 })"),
  methodFixture(EMITTERY_EMITTER, "emitSerial", "await emitter.emitSerial(\"order-placed\", { id: 42 })"),
]

const NANO_EVENTS = "Nano Events"

const NANO_EVENTS_EMITTER: MadeEmitter = {
  library: NANO_EVENTS,
  factoryKey: "factory:createNanoEvents:*",
  made: "import { createNanoEvents } from \"nanoevents\"\nconst emitter = createNanoEvents()",
}

export const nanoEventsFixtures: readonly PatternFixture[] = [
  factoryFixture(NANO_EVENTS_EMITTER, "const createNanoEvents = () => ({})\nconst emitter = createNanoEvents()"),
  methodFixture(NANO_EVENTS_EMITTER, "on", "const unbind = emitter.on(\"tick\", (volume) => { summary += volume })"),
  methodFixture(NANO_EVENTS_EMITTER, "emit", "emitter.emit(\"tick\", 2)"),
]

const EVENTEMITTER2 = "EventEmitter2"

const EVENTEMITTER2_DEFAULT: MadeEmitter = {
  library: EVENTEMITTER2,
  factoryKey: "factory:default:*",
  made: "const EventEmitter2 = require(\"eventemitter2\")\nconst emitter = new EventEmitter2({ wildcard: true })",
}

const EVENTEMITTER2_NAMED: MadeEmitter = {
  library: EVENTEMITTER2,
  factoryKey: "factory:EventEmitter2:*",
  made: "import { EventEmitter2 } from \"eventemitter2\"\nconst emitter = new EventEmitter2({ wildcard: true })",
}

const eventemitter2MethodFixtures = (emitter: MadeEmitter): PatternFixture[] => [
  factoryFixture(emitter, "class EventEmitter2 {}\nconst emitter = new EventEmitter2({ wildcard: true })"),
  methodFixture(emitter, "on", `emitter.on("order.placed", ${LISTENER})`),
  methodFixture(emitter, "addListener", `emitter.addListener("order.placed", ${LISTENER})`),
  methodFixture(emitter, "once", `emitter.once("order.placed", ${LISTENER})`),
  methodFixture(emitter, "prependListener", `emitter.prependListener("order.placed", ${LISTENER})`),
  methodFixture(emitter, "prependOnceListener", `emitter.prependOnceListener("order.placed", ${LISTENER})`),
  methodFixture(emitter, "many", `emitter.many("order.placed", 4, ${LISTENER})`),
  methodFixture(emitter, "prependMany", `emitter.prependMany("order.placed", 4, ${LISTENER})`),
  methodFixture(emitter, "onAny", "emitter.onAny((event, value) => { audit(event, value) })"),
  methodFixture(emitter, "prependAny", "emitter.prependAny((event, value) => { audit(event, value) })"),
  methodFixture(emitter, "emit", "emitter.emit(\"order.placed\", { id: 42 })"),
  methodFixture(emitter, "emitAsync", "await emitter.emitAsync(\"order.placed\", { id: 42 })"),
]

export const eventemitter2Fixtures: readonly PatternFixture[] = [
  ...eventemitter2MethodFixtures(EVENTEMITTER2_DEFAULT),
  ...eventemitter2MethodFixtures(EVENTEMITTER2_NAMED),
]
