import type { PatternFixture } from "@/catalogue/types"

const LOCAL_SOCKET = "const socket = makeLocalRegistry()"

const SOCKET_IO = "socket.io"

export const socketIoFixtures: readonly PatternFixture[] = [
  {
    library: SOCKET_IO,
    patternKey: "factory:Server:*",
    matches: [
      "import { Server } from \"socket.io\"\nconst io = new Server(httpServer)",
    ],
    rejects: [
      "const Server = (...parts) => parts\nconst io = new Server(httpServer)",
    ],
  },
  {
    library: SOCKET_IO,
    patternKey: "factory:Server:*>call:on:*",
    matches: [
      "import { Server } from \"socket.io\"\nconst io = new Server(httpServer)\nio.on(\"connection\", (socket) => { socket.join(\"room1\") })",
    ],
    rejects: [
      "const io = makeLocalRegistry()\nio.on(\"connection\", (socket) => { socket.join(\"room1\") })",
    ],
  },
  {
    library: SOCKET_IO,
    patternKey: "factory:Server:*>call:emit:*",
    matches: [
      "import { Server } from \"socket.io\"\nconst io = new Server(httpServer)\nio.to(\"room1\").emit(\"hello\", \"world\")",
    ],
    rejects: [
      "const io = makeLocalRegistry()\nio.to(\"room1\").emit(\"hello\", \"world\")",
    ],
  },
  {
    library: SOCKET_IO,
    patternKey: "factory:Server:*>call:use:*",
    matches: [
      "import { Server } from \"socket.io\"\nconst io = new Server(httpServer)\nio.use((socket, next) => { checkToken(socket.handshake.auth.token, next) })",
    ],
    rejects: [
      "const io = makeLocalRegistry()\nio.use((socket, next) => { checkToken(socket.handshake.auth.token, next) })",
    ],
  },
  {
    library: SOCKET_IO,
    patternKey: "factory:io:*",
    matches: [
      "import { io } from \"socket.io-client\"\nconst socket = io(\"http://localhost:3000\")",
    ],
    rejects: [
      "const io = (...parts) => parts\nconst socket = io(\"http://localhost:3000\")",
    ],
  },
  {
    library: SOCKET_IO,
    patternKey: "factory:io:*>call:on:*",
    matches: [
      "import { io } from \"socket.io-client\"\nconst socket = io(\"http://localhost:3000\")\nsocket.on(\"hello\", (message) => { report(message) })",
    ],
    rejects: [
      `${LOCAL_SOCKET}\nsocket.on("hello", (message) => { report(message) })`,
    ],
  },
  {
    library: SOCKET_IO,
    patternKey: "factory:io:*>call:emit:*",
    matches: [
      "import { io } from \"socket.io-client\"\nconst socket = io(\"http://localhost:3000\")\nsocket.emit(\"hello\", \"world\")",
    ],
    rejects: [
      `${LOCAL_SOCKET}\nsocket.emit("hello", "world")`,
    ],
  },
]

const WS = "ws"

const WS_LOCAL_SERVER = "const wss = makeLocalRegistry()"

const wsServerFixtures = (name: string, made: string): readonly PatternFixture[] => [
  {
    library: WS,
    patternKey: `factory:${name}:*`,
    matches: [made],
    rejects: [`const ${name} = function (options) { this.options = options }\nconst wss = new ${name}({ port: 8080 })`],
  },
  {
    library: WS,
    patternKey: `factory:${name}:*>call:on:*`,
    matches: [`${made}\nwss.on("connection", function connection(ws) { ws.send("something") })`],
    rejects: [`${WS_LOCAL_SERVER}\nwss.on("connection", function connection(ws) { ws.send("something") })`],
  },
  {
    library: WS,
    patternKey: `factory:${name}:*>call:handleUpgrade:*`,
    matches: [`${made}\nwss.handleUpgrade(request, socket, head, function done(ws) { wss.emit("connection", ws, request) })`],
    rejects: [`${WS_LOCAL_SERVER}\nwss.handleUpgrade(request, socket, head, function done(ws) { wss.emit("connection", ws, request) })`],
  },
]

const WS_CLIENT = "import WebSocket from \"ws\"\nconst ws = new WebSocket(\"ws://www.host.com/path\")"

const WS_LOCAL_CLIENT = "const ws = makeLocalRegistry()"

export const wsFixtures: readonly PatternFixture[] = [
  ...wsServerFixtures("WebSocketServer", "import { WebSocketServer } from \"ws\"\nconst wss = new WebSocketServer({ port: 8080 })"),
  ...wsServerFixtures("Server", "const WebSocket = require(\"ws\")\nconst wss = new WebSocket.Server({ port: 8080 })"),
  {
    library: WS,
    patternKey: "factory:default:*",
    matches: [WS_CLIENT],
    rejects: ["const WebSocket = function (url) { this.url = url }\nconst ws = new WebSocket(\"ws://www.host.com/path\")"],
  },
  {
    library: WS,
    patternKey: "factory:default:*>call:on:*",
    matches: [`${WS_CLIENT}\nws.on("message", function message(data) { report(data) })`],
    rejects: [`${WS_LOCAL_CLIENT}\nws.on("message", function message(data) { report(data) })`],
  },
  {
    library: WS,
    patternKey: "factory:default:*>call:send:*",
    matches: [`${WS_CLIENT}\nws.send("something")`],
    rejects: [`${WS_LOCAL_CLIENT}\nws.send("something")`],
  },
]

const UWEBSOCKETS = "uWebSockets.js"

const UWEBSOCKETS_LOCAL_APP = "const app = makeLocalRegistry()"

const UWEBSOCKETS_BEHAVIOR = "app.ws(\"/*\", { upgrade: (res, req, context) => { acceptUpgrade(res, req, context) }, open: (ws) => { ws.subscribe(\"chat\") }, message: (ws, message, isBinary) => { ws.send(message, isBinary) }, drain: (ws) => { report(ws.getBufferedAmount()) }, dropped: (ws, message) => { report(message) }, subscription: (ws, topic) => { report(topic) }, close: (ws, code) => { report(code) } })"

const uWebSocketsFactoryFixtures = (name: string, made: string): readonly PatternFixture[] => [
  {
    library: UWEBSOCKETS,
    patternKey: `factory:${name}:*`,
    matches: [made],
    rejects: [`const ${name} = (...parts) => parts\nconst app = ${name}()`],
  },
  {
    library: UWEBSOCKETS,
    patternKey: `factory:${name}:*>call:ws:*`,
    matches: [`${made}\n${UWEBSOCKETS_BEHAVIOR}`],
    rejects: [`${UWEBSOCKETS_LOCAL_APP}\n${UWEBSOCKETS_BEHAVIOR}`],
  },
  {
    library: UWEBSOCKETS,
    patternKey: `factory:${name}:*>call:publish:*`,
    matches: [`${made}\napp.publish("chat", "hello")`],
    rejects: [`${UWEBSOCKETS_LOCAL_APP}\napp.publish("chat", "hello")`],
  },
]

export const uWebSocketsFixtures: readonly PatternFixture[] = [
  ...uWebSocketsFactoryFixtures("App", "import uWS from \"uWebSockets.js\"\nconst app = uWS.App()"),
  ...uWebSocketsFactoryFixtures(
    "SSLApp",
    "const { SSLApp } = require(\"uWebSockets.js\")\nconst app = SSLApp({ key_file_name: \"misc/key.pem\", cert_file_name: \"misc/cert.pem\" })",
  ),
]

const COLYSEUS = "Colyseus"

const COLYSEUS_CLIENT = "import { Client } from \"@colyseus/sdk\"\nconst client = new Client(\"http://localhost:2567\")"

const COLYSEUS_LOCAL_ROOM = "const room = makeLocalRegistry()"

const colyseusJoinFixtures = (name: string): readonly PatternFixture[] => {
  const joined = `${COLYSEUS_CLIENT}\nconst room = await client.${name}("my_room")`
  const key = `factory:Client:*>factory:${name}:*`
  return [
    {
      library: COLYSEUS,
      patternKey: key,
      matches: [joined],
      rejects: [`const client = makeLocalRegistry()\nconst room = await client.${name}("my_room")`],
    },
    {
      library: COLYSEUS,
      patternKey: `${key}>call:onMessage:*`,
      matches: [`${joined}\nroom.onMessage("chat", (message) => { report(message) })`],
      rejects: [`${COLYSEUS_LOCAL_ROOM}\nroom.onMessage("chat", (message) => { report(message) })`],
    },
    {
      library: COLYSEUS,
      patternKey: `${key}>call:send:*`,
      matches: [`${joined}\nroom.send("move", { x: 10, y: 20 })`],
      rejects: [`${COLYSEUS_LOCAL_ROOM}\nroom.send("move", { x: 10, y: 20 })`],
    },
  ]
}

export const colyseusFixtures: readonly PatternFixture[] = [
  {
    library: COLYSEUS,
    patternKey: "class:Room:*>call:onMessage:*",
    matches: ["import { Room } from \"colyseus\"\nexport class ChatRoom extends Room {\n  onCreate(options) {\n    this.onMessage(\"chat\", (client, message) => this.broadcast(\"chat\", message))\n  }\n}"],
    rejects: ["class Room {}\nexport class ChatRoom extends Room {\n  onCreate(options) {\n    this.onMessage(\"chat\", (client, message) => this.broadcast(\"chat\", message))\n  }\n}"],
  },
  {
    library: COLYSEUS,
    patternKey: "class:Room:*>call:broadcast:*",
    matches: ["import { Room } from \"colyseus\"\nexport class ChatRoom extends Room {\n  onCreate(options) {\n    this.broadcast(\"action-taken\", \"an action has been taken!\")\n  }\n}"],
    rejects: ["class Room {}\nexport class ChatRoom extends Room {\n  onCreate(options) {\n    this.broadcast(\"action-taken\", \"an action has been taken!\")\n  }\n}"],
  },
  {
    library: COLYSEUS,
    patternKey: "class:Room:*",
    matches: [
      "import { Room } from \"colyseus\"\nexport class MyRoom extends Room {\n  onJoin(client, options) { this.state.players.set(client.sessionId, new Player()) }\n  onLeave(client) { this.state.players.delete(client.sessionId) }\n}",
    ],
    rejects: [
      "class Room {}\nexport class MyRoom extends Room {\n  onJoin(client, options) { this.state.players.set(client.sessionId, new Player()) }\n  onLeave(client) { this.state.players.delete(client.sessionId) }\n}",
    ],
  },
  {
    library: COLYSEUS,
    patternKey: "factory:Client:*",
    matches: [COLYSEUS_CLIENT],
    rejects: ["class Client {}\nconst client = new Client(\"http://localhost:2567\")"],
  },
  ...colyseusJoinFixtures("joinOrCreate"),
  ...colyseusJoinFixtures("join"),
  ...colyseusJoinFixtures("create"),
  ...colyseusJoinFixtures("joinById"),
]

const PARTYKIT = "PartyKit"

const partyKitSocketFixtures = (factoryKey: string, made: string, localFactory: string): readonly PatternFixture[] => [
  {
    library: PARTYKIT,
    patternKey: factoryKey,
    matches: [made],
    rejects: [localFactory],
  },
  {
    library: PARTYKIT,
    patternKey: `${factoryKey}>call:addEventListener:*`,
    matches: [`${made}\nsocket.addEventListener("message", (event) => { report(event.data) })`],
    rejects: [`${LOCAL_SOCKET}\nsocket.addEventListener("message", (event) => { report(event.data) })`],
  },
  {
    library: PARTYKIT,
    patternKey: `${factoryKey}>call:send:*`,
    matches: [`${made}\nsocket.send("hello from the client!")`],
    rejects: [`${LOCAL_SOCKET}\nsocket.send("hello from the client!")`],
  },
]

export const partyKitFixtures: readonly PatternFixture[] = [
  {
    library: PARTYKIT,
    patternKey: "class:Server:*>call:broadcast:*",
    matches: ["import { Server } from \"partyserver\"\nexport class Chat extends Server {\n  onMessage(connection, message) {\n    this.broadcast(message, [connection.id])\n  }\n}"],
    rejects: ["class Server {}\nexport class Chat extends Server {\n  onMessage(connection, message) {\n    this.broadcast(message, [connection.id])\n  }\n}"],
  },
  {
    library: PARTYKIT,
    patternKey: "class:Server:*",
    matches: [
      "import { Server } from \"partyserver\"\nexport class MyServer extends Server {\n  onMessage(connection, message) { this.broadcast(message, [connection.id]) }\n}",
    ],
    rejects: [
      "class Server {}\nexport class MyServer extends Server {\n  onMessage(connection, message) { this.broadcast(message, [connection.id]) }\n}",
    ],
  },
  ...partyKitSocketFixtures(
    "factory:PartySocket:*",
    "import { PartySocket } from \"partysocket\"\nconst socket = new PartySocket({ party: \"my-server\", room: \"my-room\" })",
    "class PartySocket {}\nconst socket = new PartySocket({ party: \"my-server\", room: \"my-room\" })",
  ),
  ...partyKitSocketFixtures(
    "factory:default@partysocket:*",
    "import PartySocket from \"partysocket\"\nconst socket = new PartySocket({ host: \"localhost:1999\", room: \"my-room\" })",
    "class PartySocket {}\nconst socket = new PartySocket({ host: \"localhost:1999\", room: \"my-room\" })",
  ),
  ...partyKitSocketFixtures(
    "factory:usePartySocket:*",
    "import { usePartySocket } from \"partysocket/react\"\nconst socket = usePartySocket({ party: \"chat\", room: \"general\" })",
    "const usePartySocket = (options) => options\nconst socket = usePartySocket({ party: \"chat\", room: \"general\" })",
  ),
]
