import type { CatalogueLibrary, MethodPattern } from "@/catalogue/types"

const FIRST_ARGUMENT = 0

const SOCKET_IO_SOCKET_METHODS: readonly MethodPattern[] = [
  { kind: "call", name: "on", slots: [{ at: 1, runs: "event" }], eventAt: FIRST_ARGUMENT },
  { kind: "call", name: "emit", slots: [], makes: "publish", eventAt: FIRST_ARGUMENT },
]

export const socketIoLibrary: CatalogueLibrary = {
  name: "socket.io",
  specifiers: ["socket.io", "socket.io-client"],
  documentedVersion: "4.8",
  category: "realtime",
  type: "fullstack",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "Server",
      methods: [...SOCKET_IO_SOCKET_METHODS, { kind: "call", name: "use", slots: [{ at: FIRST_ARGUMENT, runs: "middleware" }] }],
    },
    { kind: "factory", name: "io", methods: SOCKET_IO_SOCKET_METHODS },
  ],
}

const WS_SERVER_METHODS: readonly MethodPattern[] = [
  { kind: "call", name: "on", slots: [{ at: 1, runs: "event" }], eventAt: FIRST_ARGUMENT },
  { kind: "call", name: "handleUpgrade", slots: [{ at: "last", runs: "event" }] },
]

export const wsLibrary: CatalogueLibrary = {
  name: "ws",
  specifiers: ["ws"],
  documentedVersion: "8.18",
  category: "realtime",
  type: "backend",
  language: "javascript",
  patterns: [
    { kind: "factory", name: "WebSocketServer", methods: WS_SERVER_METHODS },
    { kind: "factory", name: "Server", methods: WS_SERVER_METHODS },
    {
      kind: "factory",
      name: "default",
      methods: [
        { kind: "call", name: "on", slots: [{ at: 1, runs: "event" }], eventAt: FIRST_ARGUMENT },
        { kind: "call", name: "send", slots: [], makes: "publish" },
      ],
    },
  ],
}

const UWEBSOCKETS_APP_METHODS: readonly MethodPattern[] = [
  {
    kind: "call",
    name: "ws",
    slots: [
      { at: "upgrade", runs: "event" },
      { at: "open", runs: "event" },
      { at: "message", runs: "event" },
      { at: "drain", runs: "event" },
      { at: "dropped", runs: "event" },
      { at: "subscription", runs: "event" },
      { at: "close", runs: "event" },
    ],
  },
  { kind: "call", name: "publish", slots: [], makes: "publish", eventAt: FIRST_ARGUMENT },
]

export const uWebSocketsLibrary: CatalogueLibrary = {
  name: "uWebSockets.js",
  specifiers: ["uWebSockets.js"],
  documentedVersion: "20.71",
  category: "realtime",
  type: "backend",
  language: "javascript",
  patterns: [
    { kind: "factory", name: "App", methods: UWEBSOCKETS_APP_METHODS },
    { kind: "factory", name: "SSLApp", methods: UWEBSOCKETS_APP_METHODS },
  ],
}

const COLYSEUS_ROOM_METHODS: readonly MethodPattern[] = [
  { kind: "call", name: "onMessage", slots: [{ at: 1, runs: "event" }], eventAt: FIRST_ARGUMENT },
  { kind: "call", name: "send", slots: [], makes: "publish", eventAt: FIRST_ARGUMENT },
]

export const colyseusLibrary: CatalogueLibrary = {
  name: "Colyseus",
  specifiers: ["colyseus", "@colyseus/core", "@colyseus/sdk", "colyseus.js"],
  documentedVersion: "0.18",
  category: "realtime",
  type: "fullstack",
  language: "javascript",
  patterns: [
    {
      kind: "class",
      name: "Room",
      members: [
        { name: "onAuth", runs: "event" },
        { name: "onCreate", runs: "event" },
        { name: "onJoin", runs: "event" },
        { name: "onDrop", runs: "event" },
        { name: "onReconnect", runs: "event" },
        { name: "onLeave", runs: "event" },
        { name: "onDispose", runs: "event" },
      ],
      methods: [
        { kind: "call", name: "onMessage", slots: [{ at: 1, runs: "event" }], eventAt: 0 },
        { kind: "call", name: "broadcast", slots: [], makes: "publish", eventAt: 0 },
      ],
    },
    {
      kind: "factory",
      name: "Client",
      methods: [
        { kind: "factory", name: "joinOrCreate", methods: COLYSEUS_ROOM_METHODS },
        { kind: "factory", name: "join", methods: COLYSEUS_ROOM_METHODS },
        { kind: "factory", name: "create", methods: COLYSEUS_ROOM_METHODS },
        { kind: "factory", name: "joinById", methods: COLYSEUS_ROOM_METHODS },
      ],
    },
  ],
}

const PARTYKIT_SOCKET_METHODS: readonly MethodPattern[] = [
  { kind: "call", name: "addEventListener", slots: [{ at: 1, runs: "event" }], eventAt: FIRST_ARGUMENT },
  { kind: "call", name: "send", slots: [], makes: "publish" },
]

export const partyKitLibrary: CatalogueLibrary = {
  name: "PartyKit",
  specifiers: ["partyserver", "partysocket", "partysocket/react"],
  documentedVersion: "0.5",
  category: "realtime",
  type: "fullstack",
  language: "javascript",
  patterns: [
    {
      kind: "class",
      name: "Server",
      members: [
        { name: "onStart", runs: "event" },
        { name: "onConnect", runs: "event" },
        { name: "onMessage", runs: "event" },
        { name: "onClose", runs: "event" },
        { name: "onError", runs: "event" },
        { name: "onAlarm", runs: "event" },
        { name: "onRequest", runs: "route", method: "*" },
      ],
      methods: [{ kind: "call", name: "broadcast", slots: [], makes: "publish" }],
    },
    { kind: "factory", name: "PartySocket", methods: PARTYKIT_SOCKET_METHODS },
    { kind: "factory", name: "default", from: "partysocket", methods: PARTYKIT_SOCKET_METHODS },
    { kind: "factory", name: "usePartySocket", methods: PARTYKIT_SOCKET_METHODS },
  ],
}
