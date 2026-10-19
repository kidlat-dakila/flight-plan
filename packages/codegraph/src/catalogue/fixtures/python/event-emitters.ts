import type { PatternFixture } from "@/catalogue/types"

const LOCAL_EMITTER = "emitter = make_local_registry()"

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

const methodFixture = ({ library, factoryKey, made }: MadeEmitter, methodKey: string, use: string): PatternFixture => ({
  library,
  patternKey: `${factoryKey}>${methodKey}`,
  matches: [`${made}\n\n${use}`],
  rejects: [`${LOCAL_EMITTER}\n\n${use}`],
})

const BLINKER = "blinker"

const blinkerSignalFixtures = (emitter: MadeEmitter, local: string): PatternFixture[] => [
  factoryFixture(emitter, local),
  methodFixture(emitter, "call:connect:*", "emitter.connect(send_receipt)"),
  methodFixture(emitter, "decorator:connect:*", "@emitter.connect\ndef send_receipt(sender, **extra):\n    mail(sender)"),
  methodFixture(emitter, "decorator:connect_via:*", "@emitter.connect_via(shop)\ndef send_receipt(sender, **extra):\n    mail(sender)"),
  methodFixture(emitter, "call:send:*", "emitter.send(shop, order_id=42)"),
  methodFixture(emitter, "call:send_async:*", "await emitter.send_async(shop, order_id=42)"),
]

const BLINKER_NAMESPACE: MadeEmitter = {
  library: BLINKER,
  factoryKey: "factory:Namespace:*",
  made: "from blinker import Namespace\n\nshop_signals = Namespace()",
}

const BLINKER_NAMESPACE_SIGNAL: MadeEmitter = {
  library: BLINKER,
  factoryKey: "factory:Namespace:*>factory:signal:*",
  made: "from blinker import Namespace\n\nshop_signals = Namespace()\nemitter = shop_signals.signal(\"order-placed\")",
}

export const blinkerFixtures: readonly PatternFixture[] = [
  ...blinkerSignalFixtures(
    { library: BLINKER, factoryKey: "factory:signal:*", made: "from blinker import signal\n\nemitter = signal(\"order-placed\")" },
    "def signal(name):\n    return name\n\nemitter = signal(\"order-placed\")",
  ),
  ...blinkerSignalFixtures(
    { library: BLINKER, factoryKey: "factory:Signal:*", made: "from blinker import Signal\n\nemitter = Signal()" },
    "class Signal:\n    pass\n\nemitter = Signal()",
  ),
  ...blinkerSignalFixtures(
    { library: BLINKER, factoryKey: "factory:NamedSignal:*", made: "from blinker import NamedSignal\n\nemitter = NamedSignal(\"order-placed\")" },
    "class NamedSignal:\n    pass\n\nemitter = NamedSignal(\"order-placed\")",
  ),
  factoryFixture(BLINKER_NAMESPACE, "class Namespace:\n    pass\n\nshop_signals = Namespace()"),
  ...blinkerSignalFixtures(BLINKER_NAMESPACE_SIGNAL, "shop_signals = make_local_registry()\nemitter = shop_signals.signal(\"order-placed\")"),
]

const PYEE = "pyee"

const pyeeEmitterFixtures = (emitter: MadeEmitter, local: string): PatternFixture[] => [
  factoryFixture(emitter, local),
  methodFixture(emitter, "call:on:*", "emitter.on(\"order-placed\", send_receipt)"),
  methodFixture(emitter, "decorator:on:*", "@emitter.on(\"order-placed\")\ndef send_receipt(order):\n    mail(order)"),
  methodFixture(emitter, "call:once:*", "emitter.once(\"order-placed\", send_receipt)"),
  methodFixture(emitter, "decorator:once:*", "@emitter.once(\"order-placed\")\ndef send_receipt(order):\n    mail(order)"),
  methodFixture(emitter, "call:add_listener:*", "emitter.add_listener(\"order-placed\", send_receipt)"),
  methodFixture(emitter, "decorator:listens_to:*", "@emitter.listens_to(\"order-placed\")\ndef send_receipt(order):\n    mail(order)"),
  methodFixture(emitter, "call:emit:*", "emitter.emit(\"order-placed\", order)"),
]

const pyeeEmitterOf = (name: string, specifier: string): PatternFixture[] =>
  pyeeEmitterFixtures(
    { library: PYEE, factoryKey: `factory:${name}:*`, made: `from ${specifier} import ${name}\n\nemitter = ${name}()` },
    `class ${name}:\n    pass\n\nemitter = ${name}()`,
  )

export const pyeeFixtures: readonly PatternFixture[] = [
  ...pyeeEmitterOf("EventEmitter", "pyee.base"),
  ...pyeeEmitterOf("AsyncIOEventEmitter", "pyee.asyncio"),
  ...pyeeEmitterOf("ExecutorEventEmitter", "pyee.executor"),
  ...pyeeEmitterOf("TwistedEventEmitter", "pyee.twisted"),
  ...pyeeEmitterOf("TrioEventEmitter", "pyee.trio"),
]

const ZOPE_EVENT = "zope.event"

export const zopeEventFixtures: readonly PatternFixture[] = [
  {
    library: ZOPE_EVENT,
    patternKey: "call:notify:*",
    matches: [
      "from zope.event import notify\n\nnotify(OrderPlaced(order))",
      "import zope.event\n\nzope.event.notify(OrderPlaced(order))",
    ],
    rejects: [
      "def notify(event):\n    return event\n\nnotify(OrderPlaced(order))",
    ],
  },
  {
    library: ZOPE_EVENT,
    patternKey: "call:subscribers.append:*",
    matches: [
      "from zope.event import subscribers\n\nsubscribers.append(send_receipt)",
      "import zope.event\n\nzope.event.subscribers.append(send_receipt)",
    ],
    rejects: [
      "subscribers = []\n\nsubscribers.append(send_receipt)",
    ],
  },
  {
    library: ZOPE_EVENT,
    patternKey: "call:handler:*",
    matches: [
      "from zope.event.classhandler import handler\n\nhandler(OrderPlaced, send_receipt)",
    ],
    rejects: [
      "def handler(*parts):\n    return parts\n\nhandler(OrderPlaced, send_receipt)",
    ],
  },
  {
    library: ZOPE_EVENT,
    patternKey: "decorator:handler:*",
    matches: [
      "from zope.event.classhandler import handler\n\n@handler(OrderPlaced)\ndef send_receipt(event):\n    mail(event)",
    ],
    rejects: [
      "def handler(*parts):\n    return lambda f: f\n\n@handler(OrderPlaced)\ndef send_receipt(event):\n    mail(event)",
    ],
  },
]

const PY_DISPATCHER = "PyDispatcher"

export const pyDispatcherFixtures: readonly PatternFixture[] = [
  {
    library: PY_DISPATCHER,
    patternKey: "call:dispatcher.connect:*",
    matches: [
      "from pydispatch import dispatcher\n\ndispatcher.connect(send_receipt, signal=\"order-placed\", sender=dispatcher.Any)",
      "from pydispatch import dispatcher\n\ndispatcher.connect(send_receipt, \"order-placed\")",
    ],
    rejects: [
      "dispatcher = make_local_registry()\n\ndispatcher.connect(send_receipt, signal=\"order-placed\", sender=shop)",
    ],
  },
  {
    library: PY_DISPATCHER,
    patternKey: "call:dispatcher.send:*",
    matches: [
      "from pydispatch import dispatcher\n\ndispatcher.send(\"order-placed\", shop, order=order)",
      "from pydispatch import dispatcher\n\ndispatcher.send(signal=\"order-placed\", sender=shop, order=order)",
    ],
    rejects: [
      "dispatcher = make_local_registry()\n\ndispatcher.send(\"order-placed\", shop, order=order)",
    ],
  },
  {
    library: PY_DISPATCHER,
    patternKey: "call:dispatcher.sendExact:*",
    matches: [
      "from pydispatch import dispatcher\n\ndispatcher.sendExact(\"order-placed\", shop, order=order)",
    ],
    rejects: [
      "dispatcher = make_local_registry()\n\ndispatcher.sendExact(\"order-placed\", shop, order=order)",
    ],
  },
]

const OBSERVABLE = "observable"

const OBSERVABLE_EMITTER: MadeEmitter = {
  library: OBSERVABLE,
  factoryKey: "factory:Observable:*",
  made: "from observable import Observable\n\nemitter = Observable()",
}

export const observableFixtures: readonly PatternFixture[] = [
  factoryFixture(OBSERVABLE_EMITTER, "class Observable:\n    pass\n\nemitter = Observable()"),
  methodFixture(OBSERVABLE_EMITTER, "call:on:*", "emitter.on(\"error\", report_error)"),
  methodFixture(OBSERVABLE_EMITTER, "decorator:on:*", "@emitter.on(\"error\")\ndef report_error(message):\n    log(message)"),
  methodFixture(OBSERVABLE_EMITTER, "call:once:*", "emitter.once(\"error\", report_error)"),
  methodFixture(OBSERVABLE_EMITTER, "decorator:once:*", "@emitter.once(\"error\")\ndef report_error(message):\n    log(message)"),
  methodFixture(OBSERVABLE_EMITTER, "call:trigger:*", "emitter.trigger(\"error\", \"Time travel to 1291 didn't work\")"),
]
