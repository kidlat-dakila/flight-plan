import type { PatternFixture } from "@/catalogue/types"

const pythonClassFixture = (library: string, name: string, specifier: string, body: string): PatternFixture => ({
  library,
  patternKey: `class:${name}:*`,
  matches: [`from ${specifier} import ${name}\n\nclass Handler(${name}):\n${body}`],
  rejects: [`class ${name}:\n    pass\n\nclass Handler(${name}):\n${body}`],
})

const WEBSOCKETS = "websockets"

export const websocketsFixtures: readonly PatternFixture[] = [
  {
    library: WEBSOCKETS,
    patternKey: "call:serve:*",
    matches: [
      "from websockets.asyncio.server import serve\n\nasync def main():\n    async with serve(hello, \"localhost\", 8765) as server:\n        await server.serve_forever()",
    ],
    rejects: [
      "def serve(*parts, **options):\n    return parts\n\nasync def main():\n    async with serve(hello, \"localhost\", 8765) as server:\n        await server.serve_forever()",
    ],
  },
  {
    library: WEBSOCKETS,
    patternKey: "call:unix_serve:*",
    matches: [
      "from websockets.asyncio.server import unix_serve\n\nasync def main():\n    async with unix_serve(hello, \"socket.sock\") as server:\n        await server.serve_forever()",
    ],
    rejects: [
      "def unix_serve(*parts, **options):\n    return parts\n\nasync def main():\n    async with unix_serve(hello, \"socket.sock\") as server:\n        await server.serve_forever()",
    ],
  },
  {
    library: WEBSOCKETS,
    patternKey: "call:broadcast:*",
    matches: [
      "from websockets.asyncio.server import broadcast\n\nbroadcast(connections, \"Hello!\")",
    ],
    rejects: [
      "def broadcast(*parts, **options):\n    return parts\n\nbroadcast(connections, \"Hello!\")",
    ],
  },
]

const AUTOBAHN = "Autobahn"

export const autobahnFixtures: readonly PatternFixture[] = [
  pythonClassFixture(AUTOBAHN, "WebSocketServerProtocol", "autobahn.twisted.websocket", "    def onMessage(self, payload, isBinary):\n        self.sendMessage(payload, isBinary)"),
  pythonClassFixture(AUTOBAHN, "WebSocketClientProtocol", "autobahn.asyncio.websocket", "    def onOpen(self):\n        self.sendMessage(\"Hello, world!\".encode(\"utf8\"))"),
]

const CHANNELS = "Channels"

const CHANNELS_WEBSOCKET_RECEIVE = "    def receive(self, text_data=None, bytes_data=None):\n        self.send(text_data=\"Hello world!\")"

const CHANNELS_LAYER = "from channels.layers import get_channel_layer\n\nchannel_layer = get_channel_layer()"

const CHANNELS_LOCAL_LAYER = "channel_layer = make_local_registry()"

export const channelsFixtures: readonly PatternFixture[] = [
  {
    library: CHANNELS,
    patternKey: "class:WebsocketConsumer:*>call:send:*",
    matches: ["from channels.generic.websocket import WebsocketConsumer\n\nclass ChatConsumer(WebsocketConsumer):\n    def receive(self, text_data):\n        self.send(text_data=\"Hello world!\")"],
    rejects: ["class WebsocketConsumer:\n    pass\n\nclass ChatConsumer(WebsocketConsumer):\n    def receive(self, text_data):\n        self.send(text_data=\"Hello world!\")"],
  },
  {
    library: CHANNELS,
    patternKey: "class:WebsocketConsumer:*>call:channel_layer.group_send:*",
    matches: ["from channels.generic.websocket import WebsocketConsumer\n\nclass ChatConsumer(WebsocketConsumer):\n    def receive(self, text_data):\n        self.channel_layer.group_send(\"chat\", {\"type\": \"chat.message\", \"text\": text_data})"],
    rejects: ["class WebsocketConsumer:\n    pass\n\nclass ChatConsumer(WebsocketConsumer):\n    def receive(self, text_data):\n        self.channel_layer.group_send(\"chat\", {\"type\": \"chat.message\", \"text\": text_data})"],
  },
  {
    library: CHANNELS,
    patternKey: "class:AsyncWebsocketConsumer:*>call:send:*",
    matches: ["from channels.generic.websocket import AsyncWebsocketConsumer\n\nclass ChatConsumer(AsyncWebsocketConsumer):\n    async def receive(self, text_data):\n        await self.send(text_data=\"Hello world!\")"],
    rejects: ["class AsyncWebsocketConsumer:\n    pass\n\nclass ChatConsumer(AsyncWebsocketConsumer):\n    async def receive(self, text_data):\n        await self.send(text_data=\"Hello world!\")"],
  },
  {
    library: CHANNELS,
    patternKey: "class:AsyncWebsocketConsumer:*>call:channel_layer.group_send:*",
    matches: ["from channels.generic.websocket import AsyncWebsocketConsumer\n\nclass ChatConsumer(AsyncWebsocketConsumer):\n    async def receive(self, text_data):\n        await self.channel_layer.group_send(\"chat\", {\"type\": \"chat.message\", \"text\": text_data})"],
    rejects: ["class AsyncWebsocketConsumer:\n    pass\n\nclass ChatConsumer(AsyncWebsocketConsumer):\n    async def receive(self, text_data):\n        await self.channel_layer.group_send(\"chat\", {\"type\": \"chat.message\", \"text\": text_data})"],
  },
  {
    library: CHANNELS,
    patternKey: "class:JsonWebsocketConsumer:*>call:send:*",
    matches: ["from channels.generic.websocket import JsonWebsocketConsumer\n\nclass ChatConsumer(JsonWebsocketConsumer):\n    def receive(self, text_data):\n        self.send(text_data=\"Hello world!\")"],
    rejects: ["class JsonWebsocketConsumer:\n    pass\n\nclass ChatConsumer(JsonWebsocketConsumer):\n    def receive(self, text_data):\n        self.send(text_data=\"Hello world!\")"],
  },
  {
    library: CHANNELS,
    patternKey: "class:JsonWebsocketConsumer:*>call:channel_layer.group_send:*",
    matches: ["from channels.generic.websocket import JsonWebsocketConsumer\n\nclass ChatConsumer(JsonWebsocketConsumer):\n    def receive(self, text_data):\n        self.channel_layer.group_send(\"chat\", {\"type\": \"chat.message\", \"text\": text_data})"],
    rejects: ["class JsonWebsocketConsumer:\n    pass\n\nclass ChatConsumer(JsonWebsocketConsumer):\n    def receive(self, text_data):\n        self.channel_layer.group_send(\"chat\", {\"type\": \"chat.message\", \"text\": text_data})"],
  },
  {
    library: CHANNELS,
    patternKey: "class:JsonWebsocketConsumer:*>call:send_json:*",
    matches: ["from channels.generic.websocket import JsonWebsocketConsumer\n\nclass ChatConsumer(JsonWebsocketConsumer):\n    def receive(self, text_data):\n        self.send_json({\"text\": text_data})"],
    rejects: ["class JsonWebsocketConsumer:\n    pass\n\nclass ChatConsumer(JsonWebsocketConsumer):\n    def receive(self, text_data):\n        self.send_json({\"text\": text_data})"],
  },
  {
    library: CHANNELS,
    patternKey: "class:AsyncJsonWebsocketConsumer:*>call:send:*",
    matches: ["from channels.generic.websocket import AsyncJsonWebsocketConsumer\n\nclass ChatConsumer(AsyncJsonWebsocketConsumer):\n    async def receive(self, text_data):\n        await self.send(text_data=\"Hello world!\")"],
    rejects: ["class AsyncJsonWebsocketConsumer:\n    pass\n\nclass ChatConsumer(AsyncJsonWebsocketConsumer):\n    async def receive(self, text_data):\n        await self.send(text_data=\"Hello world!\")"],
  },
  {
    library: CHANNELS,
    patternKey: "class:AsyncJsonWebsocketConsumer:*>call:channel_layer.group_send:*",
    matches: ["from channels.generic.websocket import AsyncJsonWebsocketConsumer\n\nclass ChatConsumer(AsyncJsonWebsocketConsumer):\n    async def receive(self, text_data):\n        await self.channel_layer.group_send(\"chat\", {\"type\": \"chat.message\", \"text\": text_data})"],
    rejects: ["class AsyncJsonWebsocketConsumer:\n    pass\n\nclass ChatConsumer(AsyncJsonWebsocketConsumer):\n    async def receive(self, text_data):\n        await self.channel_layer.group_send(\"chat\", {\"type\": \"chat.message\", \"text\": text_data})"],
  },
  {
    library: CHANNELS,
    patternKey: "class:AsyncJsonWebsocketConsumer:*>call:send_json:*",
    matches: ["from channels.generic.websocket import AsyncJsonWebsocketConsumer\n\nclass ChatConsumer(AsyncJsonWebsocketConsumer):\n    async def receive(self, text_data):\n        await self.send_json({\"text\": text_data})"],
    rejects: ["class AsyncJsonWebsocketConsumer:\n    pass\n\nclass ChatConsumer(AsyncJsonWebsocketConsumer):\n    async def receive(self, text_data):\n        await self.send_json({\"text\": text_data})"],
  },
  pythonClassFixture(CHANNELS, "SyncConsumer", "channels.consumer", "    def websocket_connect(self, event):\n        self.send({\"type\": \"websocket.accept\"})"),
  pythonClassFixture(CHANNELS, "AsyncConsumer", "channels.consumer", "    async def websocket_receive(self, event):\n        await self.send({\"type\": \"websocket.send\", \"text\": event[\"text\"]})"),
  pythonClassFixture(CHANNELS, "AsyncHttpConsumer", "channels.generic.http", "    async def handle(self, body):\n        await self.send_response(200, b\"ok\")"),
  pythonClassFixture(CHANNELS, "WebsocketConsumer", "channels.generic.websocket", CHANNELS_WEBSOCKET_RECEIVE),
  pythonClassFixture(CHANNELS, "AsyncWebsocketConsumer", "channels.generic.websocket", "    async def connect(self):\n        await self.accept()"),
  pythonClassFixture(CHANNELS, "JsonWebsocketConsumer", "channels.generic.websocket", "    def receive_json(self, content):\n        self.send_json(content)"),
  pythonClassFixture(CHANNELS, "AsyncJsonWebsocketConsumer", "channels.generic.websocket", "    async def receive_json(self, content):\n        await self.send_json(content)"),
  {
    library: CHANNELS,
    patternKey: "factory:get_channel_layer:*",
    matches: [CHANNELS_LAYER],
    rejects: ["def get_channel_layer():\n    return None\n\nchannel_layer = get_channel_layer()"],
  },
  {
    library: CHANNELS,
    patternKey: "factory:get_channel_layer:*>call:send:*",
    matches: [`${CHANNELS_LAYER}\nawait channel_layer.send("channel_name", {"type": "hello.message", "text": "Hello there!"})`],
    rejects: [`${CHANNELS_LOCAL_LAYER}\nawait channel_layer.send("channel_name", {"type": "hello.message", "text": "Hello there!"})`],
  },
  {
    library: CHANNELS,
    patternKey: "factory:get_channel_layer:*>call:group_send:*",
    matches: [`${CHANNELS_LAYER}\nawait channel_layer.group_send("chat", {"type": "chat.message"})`],
    rejects: [`${CHANNELS_LOCAL_LAYER}\nawait channel_layer.group_send("chat", {"type": "chat.message"})`],
  },
]

const PYTHON_SOCKETIO = "python-socketio"

const PYTHON_SOCKETIO_LOCAL = "sio = make_local_registry()"

const pythonSocketioFactoryFixtures = (name: string): readonly PatternFixture[] => {
  const made = `import socketio\n\nsio = socketio.${name}()`
  const key = `factory:${name}:*`
  const methodFixture = (methodKey: string, code: string): PatternFixture => ({
    library: PYTHON_SOCKETIO,
    patternKey: `${key}>${methodKey}:*`,
    matches: [`${made}\n\n${code}`],
    rejects: [`${PYTHON_SOCKETIO_LOCAL}\n\n${code}`],
  })
  return [
    {
      library: PYTHON_SOCKETIO,
      patternKey: key,
      matches: [made],
      rejects: [`class socketio:\n    ${name} = dict\n\nsio = socketio.${name}()`],
    },
    methodFixture("decorator:event", "@sio.event\ndef connect(sid, environ):\n    print(\"connect \", sid)"),
    methodFixture("decorator:on", "@sio.on(\"my custom event\")\ndef another_event(sid, data):\n    print(data)"),
    methodFixture("call:emit", "sio.emit(\"my event\", {\"data\": \"foobar\"}, to=user_sid)"),
    methodFixture("call:call", "sio.call(\"my event\", {\"data\": \"foobar\"}, to=user_sid)"),
    methodFixture("call:send", "sio.send({\"data\": \"foobar\"}, to=user_sid)"),
  ]
}

const PYTHON_SOCKETIO_NAMESPACE_BODY = "    def on_my_event(self, sid, data):\n        self.emit(\"my_response\", data)"

const pythonSocketioNamespaceFixture = (name: string): PatternFixture => ({
  library: PYTHON_SOCKETIO,
  patternKey: `class:${name}:*`,
  matches: [`import socketio\n\nclass MyCustomNamespace(socketio.${name}):\n${PYTHON_SOCKETIO_NAMESPACE_BODY}`],
  rejects: [`class ${name}:\n    pass\n\nclass MyCustomNamespace(${name}):\n${PYTHON_SOCKETIO_NAMESPACE_BODY}`],
})

export const pythonSocketioFixtures: readonly PatternFixture[] = [
  ...pythonSocketioFactoryFixtures("Server"),
  ...pythonSocketioFactoryFixtures("AsyncServer"),
  ...pythonSocketioFactoryFixtures("Client"),
  ...pythonSocketioFactoryFixtures("AsyncClient"),
  pythonSocketioNamespaceFixture("Namespace"),
  pythonSocketioNamespaceFixture("AsyncNamespace"),
  pythonSocketioNamespaceFixture("ClientNamespace"),
  pythonSocketioNamespaceFixture("AsyncClientNamespace"),
]

const SSE_STARLETTE = "sse-starlette"

const sseStarletteCallFixture = (name: string, code: string): PatternFixture => ({
  library: SSE_STARLETTE,
  patternKey: `call:${name}:*`,
  matches: [`from sse_starlette import ${name}\n\n${code}`],
  rejects: [`def ${name}(*parts, **options):\n    return parts\n\n${code}`],
})

export const sseStarletteFixtures: readonly PatternFixture[] = [
  sseStarletteCallFixture("EventSourceResponse", "async def sse_endpoint(request):\n    return EventSourceResponse(generate_events())"),
  sseStarletteCallFixture("ServerSentEvent", "async def generate_events():\n    yield ServerSentEvent(data=\"tick\", event=\"update\")"),
  sseStarletteCallFixture("JSONServerSentEvent", "async def generate_events():\n    yield JSONServerSentEvent(data={\"count\": 1}, event=\"update\")"),
]
