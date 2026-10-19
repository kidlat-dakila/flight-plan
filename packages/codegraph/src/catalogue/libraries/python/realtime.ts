import type { CatalogueLibrary, ClassMember, MethodPattern } from "@/catalogue/types"

const FIRST_ARGUMENT = 0

export const websocketsLibrary: CatalogueLibrary = {
  name: "websockets",
  specifiers: ["websockets", "websockets.asyncio.server", "websockets.asyncio.client", "websockets.sync.server"],
  documentedVersion: "17.2",
  category: "realtime",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "call", name: "serve", slots: [{ at: FIRST_ARGUMENT, runs: "event" }] },
    { kind: "call", name: "unix_serve", slots: [{ at: FIRST_ARGUMENT, runs: "event" }] },
    { kind: "call", name: "broadcast", slots: [], makes: "publish" },
  ],
}

const AUTOBAHN_PROTOCOL_MEMBERS: readonly ClassMember[] = [
  { name: "onConnect", runs: "event" },
  { name: "onOpen", runs: "event" },
  { name: "onMessage", runs: "event" },
  { name: "onClose", runs: "event" },
]

export const autobahnLibrary: CatalogueLibrary = {
  name: "Autobahn",
  specifiers: ["autobahn", "autobahn.twisted.websocket", "autobahn.asyncio.websocket"],
  documentedVersion: "26.10",
  category: "realtime",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "class", name: "WebSocketServerProtocol", members: AUTOBAHN_PROTOCOL_MEMBERS, methods: [] },
    {
      kind: "class",
      name: "WebSocketClientProtocol",
      members: [{ name: "onConnecting", runs: "event" }, ...AUTOBAHN_PROTOCOL_MEMBERS],
      methods: [],
    },
  ],
}

const CHANNELS_ASGI_MEMBERS: readonly ClassMember[] = [
  { name: "websocket_connect", runs: "event" },
  { name: "websocket_receive", runs: "event" },
  { name: "websocket_disconnect", runs: "event" },
]

const CHANNELS_WEBSOCKET_MEMBERS: readonly ClassMember[] = [
  { name: "connect", runs: "event" },
  { name: "receive", runs: "event" },
  { name: "disconnect", runs: "event" },
]

const CHANNELS_JSON_WEBSOCKET_MEMBERS: readonly ClassMember[] = [...CHANNELS_WEBSOCKET_MEMBERS, { name: "receive_json", runs: "event" }]

const CHANNELS_CONSUMER_METHODS: readonly MethodPattern[] = [
  { kind: "call", name: "send", slots: [], makes: "publish" },
  { kind: "call", name: "channel_layer.group_send", slots: [], makes: "publish", eventAt: FIRST_ARGUMENT },
]

const CHANNELS_JSON_CONSUMER_METHODS: readonly MethodPattern[] = [...CHANNELS_CONSUMER_METHODS, { kind: "call", name: "send_json", slots: [], makes: "publish" }]

const CHANNELS_LAYER_METHODS: readonly MethodPattern[] = [
  { kind: "call", name: "send", slots: [], makes: "publish", eventAt: FIRST_ARGUMENT },
  { kind: "call", name: "group_send", slots: [], makes: "publish", eventAt: FIRST_ARGUMENT },
]

export const channelsLibrary: CatalogueLibrary = {
  name: "Channels",
  specifiers: ["channels", "channels.consumer", "channels.generic.websocket", "channels.generic.http", "channels.layers", "channels.routing"],
  documentedVersion: "4.3",
  category: "realtime",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "class", name: "SyncConsumer", members: CHANNELS_ASGI_MEMBERS, methods: [] },
    { kind: "class", name: "AsyncConsumer", members: CHANNELS_ASGI_MEMBERS, methods: [] },
    {
      kind: "class",
      name: "AsyncHttpConsumer",
      members: [{ name: "handle", runs: "route", method: "*" }, { name: "disconnect", runs: "event" }],
      methods: [],
    },
    { kind: "class", name: "WebsocketConsumer", members: CHANNELS_WEBSOCKET_MEMBERS, methods: CHANNELS_CONSUMER_METHODS },
    { kind: "class", name: "AsyncWebsocketConsumer", members: CHANNELS_WEBSOCKET_MEMBERS, methods: CHANNELS_CONSUMER_METHODS },
    { kind: "class", name: "JsonWebsocketConsumer", members: CHANNELS_JSON_WEBSOCKET_MEMBERS, methods: CHANNELS_JSON_CONSUMER_METHODS },
    { kind: "class", name: "AsyncJsonWebsocketConsumer", members: CHANNELS_JSON_WEBSOCKET_MEMBERS, methods: CHANNELS_JSON_CONSUMER_METHODS },
    { kind: "factory", name: "get_channel_layer", methods: CHANNELS_LAYER_METHODS },
  ],
}

const PYTHON_SOCKETIO_METHODS: readonly MethodPattern[] = [
  { kind: "decorator", name: "event", runs: "event" },
  { kind: "decorator", name: "on", runs: "event", eventAt: FIRST_ARGUMENT },
  { kind: "call", name: "emit", slots: [], makes: "publish", eventAt: FIRST_ARGUMENT },
  { kind: "call", name: "call", slots: [], makes: "publish", eventAt: FIRST_ARGUMENT },
  { kind: "call", name: "send", slots: [], makes: "publish" },
]

const PYTHON_SOCKETIO_NAMESPACE_MEMBERS: readonly ClassMember[] = [{ name: "on_*", runs: "event" }]

export const pythonSocketioLibrary: CatalogueLibrary = {
  name: "python-socketio",
  specifiers: ["socketio"],
  documentedVersion: "5.17",
  category: "realtime",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "factory", name: "Server", methods: PYTHON_SOCKETIO_METHODS },
    { kind: "factory", name: "AsyncServer", methods: PYTHON_SOCKETIO_METHODS },
    { kind: "factory", name: "Client", methods: PYTHON_SOCKETIO_METHODS },
    { kind: "factory", name: "AsyncClient", methods: PYTHON_SOCKETIO_METHODS },
    { kind: "class", name: "Namespace", members: PYTHON_SOCKETIO_NAMESPACE_MEMBERS, methods: [] },
    { kind: "class", name: "AsyncNamespace", members: PYTHON_SOCKETIO_NAMESPACE_MEMBERS, methods: [] },
    { kind: "class", name: "ClientNamespace", members: PYTHON_SOCKETIO_NAMESPACE_MEMBERS, methods: [] },
    { kind: "class", name: "AsyncClientNamespace", members: PYTHON_SOCKETIO_NAMESPACE_MEMBERS, methods: [] },
  ],
}

const SSE_STARLETTE_EVENT_KEY = "event"

export const sseStarletteLibrary: CatalogueLibrary = {
  name: "sse-starlette",
  specifiers: ["sse_starlette", "sse_starlette.sse", "sse_starlette.event"],
  documentedVersion: "3.5",
  category: "realtime",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "call", name: "EventSourceResponse", slots: [{ at: [FIRST_ARGUMENT, "content"], runs: "event" }] },
    { kind: "call", name: "ServerSentEvent", slots: [], makes: "publish", eventAt: SSE_STARLETTE_EVENT_KEY },
    { kind: "call", name: "JSONServerSentEvent", slots: [], makes: "publish", eventAt: SSE_STARLETTE_EVENT_KEY },
  ],
}
