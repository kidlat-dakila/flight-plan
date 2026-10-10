import type { CatalogueLibrary } from "@/catalogue/types"

export const autobahnLibrary: CatalogueLibrary = {
  name: "Autobahn",
  specifiers: ["autobahn", "autobahn.twisted.websocket", "autobahn.asyncio.websocket"],
  documentedVersion: "26.7",
  category: "queues",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "class",
      name: "WebSocketServerProtocol",
      members: [{ name: "onMessage", runs: "event" }, { name: "onConnect", runs: "event" }, { name: "onOpen", runs: "event" }, { name: "onClose", runs: "event" }],
      methods: [],
    },
  ],
}

export const celeryLibrary: CatalogueLibrary = {
  name: "Celery",
  specifiers: ["celery"],
  documentedVersion: "5.6",
  category: "queues",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "Celery",
      methods: [
        { kind: "decorator", name: "task", runs: "job" },
        { kind: "call", name: "add_periodic_task", slots: [], makes: "publish" },
      ],
    },
    { kind: "decorator", name: "shared_task", runs: "job" },
  ],
}

export const channelsLibrary: CatalogueLibrary = {
  name: "Channels",
  specifiers: ["channels", "channels.consumer", "channels.generic.websocket", "channels.generic.http", "channels.routing"],
  documentedVersion: "4.3",
  category: "queues",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "class",
      name: "SyncConsumer",
      members: [{ name: "websocket_connect", runs: "event" }, { name: "websocket_receive", runs: "event" }],
      methods: [],
    },
    {
      kind: "class",
      name: "AsyncHttpConsumer",
      members: [{ name: "handle", runs: "route", method: "*" }],
      methods: [],
    },
    {
      kind: "class",
      name: "WebsocketConsumer",
      members: [{ name: "connect", runs: "event" }, { name: "receive", runs: "event" }, { name: "disconnect", runs: "event" }],
      methods: [],
    },
  ],
}

export const hueyLibrary: CatalogueLibrary = {
  name: "huey",
  specifiers: ["huey"],
  documentedVersion: "3.4",
  category: "queues",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "RedisHuey",
      methods: [
        { kind: "decorator", name: "task", runs: "job" },
        { kind: "decorator", name: "periodic_task", runs: "job" },
      ],
    },
  ],
}

export const kafkaPythonLibrary: CatalogueLibrary = {
  name: "kafka-python",
  specifiers: ["kafka"],
  documentedVersion: "3.0",
  category: "queues",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "KafkaProducer",
      methods: [
        { kind: "call", name: "send", slots: [], makes: "publish", eventAt: 0 },
        { kind: "call", name: "flush", slots: [], makes: "publish" },
      ],
    },
    {
      kind: "factory",
      name: "KafkaConsumer",
      makes: "publish",
      methods: [
        { kind: "call", name: "subscribe", slots: [], eventAt: "0[]" },
      ],
    },
  ],
}

export const mrqLibrary: CatalogueLibrary = {
  name: "MRQ",
  specifiers: ["mrq", "mrq.task"],
  documentedVersion: "0.9",
  category: "queues",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "class",
      name: "Task",
      members: [{ name: "run", runs: "job" }],
      methods: [],
    },
  ],
}

export const rqLibrary: CatalogueLibrary = {
  name: "RQ",
  specifiers: ["rq"],
  documentedVersion: "2.12",
  category: "queues",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "Queue",
      methods: [
        { kind: "call", name: "enqueue", slots: [{ at: 0, runs: "job" }], makes: "publish" },
      ],
    },
    { kind: "decorator", name: "job", runs: "job" },
  ],
}

export const websocketsLibrary: CatalogueLibrary = {
  name: "websockets",
  specifiers: ["websockets", "websockets.asyncio.server", "websockets.asyncio.client"],
  documentedVersion: "17.2",
  category: "queues",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "call", name: "serve", slots: [{ at: 0, runs: "event" }] },
    { kind: "call", name: "broadcast", slots: [], makes: "publish" },
  ],
}
