import type { PatternFixture } from "@/catalogue/types"

const GRPC_FOR_NODE_JS = "gRPC for Node.js"
const GRPC_SERVER = "import * as grpc from \"@grpc/grpc-js\"\nconst server = new grpc.Server()"
const GRPC_LOCAL_SERVER = "const server = makeLocalServer()"
const GRPC_CLIENT = "import { Client, credentials } from \"@grpc/grpc-js\"\nconst client = new Client(\"localhost:50051\", credentials.createInsecure())"
const GRPC_LOCAL_CLIENT = "const client = makeLocalClient()"

const grpcClientFixture = (method: string): PatternFixture => ({
  library: GRPC_FOR_NODE_JS,
  patternKey: `factory:Client:*>call:${method}:*`,
  matches: [`${GRPC_CLIENT}\nconst call = client.${method}("/routeguide.RouteGuide/GetFeature", serialize, deserialize, point, callback)`],
  rejects: [`${GRPC_LOCAL_CLIENT}\nconst call = client.${method}("/routeguide.RouteGuide/GetFeature", serialize, deserialize, point, callback)`],
})

export const grpcForNodeJsFixtures: readonly PatternFixture[] = [
  {
    library: GRPC_FOR_NODE_JS,
    patternKey: "factory:Server:*",
    matches: [GRPC_SERVER],
    rejects: ["const Server = class {}\nconst server = new Server()"],
  },
  {
    library: GRPC_FOR_NODE_JS,
    patternKey: "factory:Server:*>call:addService:*",
    matches: [`${GRPC_SERVER}\nserver.addService(proto.routeguide.RouteGuide.service, { getFeature: (call, callback) => callback(null, findFeature(call.request)) })`],
    rejects: [`${GRPC_LOCAL_SERVER}\nserver.addService(proto.routeguide.RouteGuide.service, { getFeature: (call, callback) => callback(null, findFeature(call.request)) })`],
  },
  {
    library: GRPC_FOR_NODE_JS,
    patternKey: "factory:Server:*>call:register:*",
    matches: [`${GRPC_SERVER}\nserver.register("/routeguide.RouteGuide/GetFeature", (call, callback) => callback(null, findFeature(call.request)), serialize, deserialize, "unary")`],
    rejects: [`${GRPC_LOCAL_SERVER}\nserver.register("/routeguide.RouteGuide/GetFeature", (call, callback) => callback(null, findFeature(call.request)), serialize, deserialize, "unary")`],
  },
  {
    library: GRPC_FOR_NODE_JS,
    patternKey: "factory:Client:*",
    matches: [GRPC_CLIENT],
    rejects: ["const Client = class {}\nconst client = new Client(\"localhost:50051\")"],
  },
  grpcClientFixture("makeUnaryRequest"),
  grpcClientFixture("makeClientStreamRequest"),
  grpcClientFixture("makeServerStreamRequest"),
  grpcClientFixture("makeBidiStreamRequest"),
]

const JSON_RPC_2 = "JSON-RPC 2.0"
const JSON_RPC_2_SERVER = "import { JSONRPCServer } from \"json-rpc-2.0\"\nconst server = new JSONRPCServer()"
const JSON_RPC_2_CLIENT = "import { JSONRPCClient } from \"json-rpc-2.0\"\nconst client = new JSONRPCClient((request) => fetch(\"/json-rpc\", { method: \"POST\", body: JSON.stringify(request) }))"
const JSON_RPC_2_SERVER_AND_CLIENT = "import { JSONRPCServerAndClient, JSONRPCServer, JSONRPCClient } from \"json-rpc-2.0\"\nconst serverAndClient = new JSONRPCServerAndClient(new JSONRPCServer(), new JSONRPCClient(send))"
const JSON_RPC_2_LOCAL = "const server = makeLocalServer()\nconst client = makeLocalClient()\nconst serverAndClient = makeLocalServerAndClient()"

const jsonRpc2Fixture = (factory: string, method: string, made: string, call: string): PatternFixture => ({
  library: JSON_RPC_2,
  patternKey: `factory:${factory}:*>call:${method}:*`,
  matches: [`${made}\n${call}`],
  rejects: [`${JSON_RPC_2_LOCAL}\n${call}`],
})

const JSON_RPC_2_ADD_METHOD = "addMethod(\"echo\", ({ text }) => text)"
const JSON_RPC_2_ADD_METHOD_ADVANCED = "addMethodAdvanced(\"doSomething\", (jsonRPCRequest) => ({ jsonrpc: \"2.0\", id: jsonRPCRequest.id, result: \"done\" }))"
const JSON_RPC_2_REQUEST = "request(\"add\", { x: 1, y: 2 })"
const JSON_RPC_2_REQUEST_ADVANCED = "requestAdvanced({ jsonrpc: \"2.0\", id: 5, method: \"sum\", params: { x: 1, y: 2 } })"
const JSON_RPC_2_NOTIFY = "notify(\"log\", { message: \"hello\" })"

export const jsonRpc2Fixtures: readonly PatternFixture[] = [
  {
    library: JSON_RPC_2,
    patternKey: "factory:JSONRPCServer:*",
    matches: [JSON_RPC_2_SERVER],
    rejects: ["const JSONRPCServer = class {}\nconst server = new JSONRPCServer()"],
  },
  jsonRpc2Fixture("JSONRPCServer", "addMethod", JSON_RPC_2_SERVER, `server.${JSON_RPC_2_ADD_METHOD}`),
  jsonRpc2Fixture("JSONRPCServer", "addMethodAdvanced", JSON_RPC_2_SERVER, `server.${JSON_RPC_2_ADD_METHOD_ADVANCED}`),
  {
    library: JSON_RPC_2,
    patternKey: "factory:JSONRPCClient:*",
    matches: [JSON_RPC_2_CLIENT],
    rejects: ["const JSONRPCClient = class {}\nconst client = new JSONRPCClient(send)"],
  },
  jsonRpc2Fixture("JSONRPCClient", "request", JSON_RPC_2_CLIENT, `client.${JSON_RPC_2_REQUEST}`),
  jsonRpc2Fixture("JSONRPCClient", "requestAdvanced", JSON_RPC_2_CLIENT, `client.${JSON_RPC_2_REQUEST_ADVANCED}`),
  jsonRpc2Fixture("JSONRPCClient", "notify", JSON_RPC_2_CLIENT, `client.${JSON_RPC_2_NOTIFY}`),
  {
    library: JSON_RPC_2,
    patternKey: "factory:JSONRPCServerAndClient:*",
    matches: [JSON_RPC_2_SERVER_AND_CLIENT],
    rejects: ["const JSONRPCServerAndClient = class {}\nconst serverAndClient = new JSONRPCServerAndClient(server, client)"],
  },
  jsonRpc2Fixture("JSONRPCServerAndClient", "addMethod", JSON_RPC_2_SERVER_AND_CLIENT, `serverAndClient.${JSON_RPC_2_ADD_METHOD}`),
  jsonRpc2Fixture("JSONRPCServerAndClient", "addMethodAdvanced", JSON_RPC_2_SERVER_AND_CLIENT, `serverAndClient.${JSON_RPC_2_ADD_METHOD_ADVANCED}`),
  jsonRpc2Fixture("JSONRPCServerAndClient", "request", JSON_RPC_2_SERVER_AND_CLIENT, `serverAndClient.${JSON_RPC_2_REQUEST}`),
  jsonRpc2Fixture("JSONRPCServerAndClient", "requestAdvanced", JSON_RPC_2_SERVER_AND_CLIENT, `serverAndClient.${JSON_RPC_2_REQUEST_ADVANCED}`),
  jsonRpc2Fixture("JSONRPCServerAndClient", "notify", JSON_RPC_2_SERVER_AND_CLIENT, `serverAndClient.${JSON_RPC_2_NOTIFY}`),
]

const CONNECT_RPC = "Connect RPC"

export const connectRpcFixtures: readonly PatternFixture[] = [
  {
    library: CONNECT_RPC,
    patternKey: "factory:ConnectRouter:*>call:service:*",
    matches: [
      "import type { ConnectRouter } from \"@connectrpc/connect\"\nimport { ElizaService } from \"./gen/eliza_pb\"\nexport default (router: ConnectRouter) =>\n  router.service(ElizaService, {\n    async say(req) {\n      return { sentence: \"You said: \" + req.sentence }\n    },\n  })",
    ],
    rejects: [
      "import { ElizaService } from \"./gen/eliza_pb\"\nexport default (router: LocalRouter) =>\n  router.service(ElizaService, {\n    async say(req) {\n      return { sentence: \"You said: \" + req.sentence }\n    },\n  })",
    ],
  },
  {
    library: CONNECT_RPC,
    patternKey: "factory:ConnectRouter:*>call:rpc:*",
    matches: [
      "import type { ConnectRouter } from \"@connectrpc/connect\"\nimport { ElizaService } from \"./gen/eliza_pb\"\nexport default (router: ConnectRouter) => {\n  router.rpc(ElizaService.method.say, async (req) => ({ sentence: req.sentence }))\n}",
    ],
    rejects: [
      "import { ElizaService } from \"./gen/eliza_pb\"\nexport default (router: LocalRouter) => {\n  router.rpc(ElizaService.method.say, async (req) => ({ sentence: req.sentence }))\n}",
    ],
  },
  {
    library: CONNECT_RPC,
    patternKey: "factory:createClient:*",
    matches: ["import { createClient } from \"@connectrpc/connect\"\nconst client = createClient(ElizaService, transport)\nconst res = await client.say({ sentence: \"I feel happy.\" })"],
    rejects: ["const createClient = (...parts) => parts\nconst client = createClient(ElizaService, transport)"],
  },
  {
    library: CONNECT_RPC,
    patternKey: "factory:createPromiseClient:*",
    matches: ["import { createPromiseClient } from \"@connectrpc/connect\"\nconst client = createPromiseClient(ElizaService, transport)"],
    rejects: ["const createPromiseClient = (...parts) => parts\nconst client = createPromiseClient(ElizaService, transport)"],
  },
]

const JAYSON = "Jayson"
const JAYSON_LOCAL = "const jayson = makeLocalRegistry()"
const JAYSON_SERVER_METHODS = "{\n  add: function (args, callback) {\n    callback(null, args[0] + args[1])\n  },\n}"

const jaysonServerFixtures = (factory: string): PatternFixture[] => {
  const made = `const jayson = require("jayson")\nconst server = new jayson.${factory}()`
  const local = `${JAYSON_LOCAL}\nconst server = new jayson.${factory}()`
  return [
    {
      library: JAYSON,
      patternKey: `factory:${factory}:*`,
      matches: [`const jayson = require("jayson")\nconst server = new jayson.${factory}(${JAYSON_SERVER_METHODS})\nserver.http().listen(3000)`],
      rejects: [`${JAYSON_LOCAL}\nconst server = new jayson.${factory}(${JAYSON_SERVER_METHODS})\nserver.http().listen(3000)`],
    },
    {
      library: JAYSON,
      patternKey: `factory:${factory}:*>call:method:*`,
      matches: [`${made}\nserver.method("add", (args, callback) => callback(null, args[0] + args[1]))`],
      rejects: [`${local}\nserver.method("add", (args, callback) => callback(null, args[0] + args[1]))`],
    },
    {
      library: JAYSON,
      patternKey: `factory:${factory}:*>call:methods:*`,
      matches: [`${made}\nserver.methods(${JAYSON_SERVER_METHODS})`],
      rejects: [`${local}\nserver.methods(${JAYSON_SERVER_METHODS})`],
    },
  ]
}

const jaysonClientFixtures = (transport: string): PatternFixture[] => [
  {
    library: JAYSON,
    patternKey: `factory:client.${transport}:*`,
    matches: [`const jayson = require("jayson/promise")\nconst client = new jayson.client.${transport}({ port: 3000 })`],
    rejects: [`${JAYSON_LOCAL}\nconst client = new jayson.client.${transport}({ port: 3000 })`],
  },
  {
    library: JAYSON,
    patternKey: `factory:client.${transport}:*>call:request:*`,
    matches: [`const jayson = require("jayson/promise")\nconst client = new jayson.client.${transport}({ port: 3000 })\nconst response = await client.request("add", [1, 1])`],
    rejects: [`${JAYSON_LOCAL}\nconst client = new jayson.client.${transport}({ port: 3000 })\nconst response = await client.request("add", [1, 1])`],
  },
]

export const jaysonFixtures: readonly PatternFixture[] = [
  ...jaysonServerFixtures("server"),
  ...jaysonServerFixtures("Server"),
  {
    library: JAYSON,
    patternKey: "factory:Method:*",
    matches: [
      "const jayson = require(\"jayson\")\nconst context = jayson.Method((args, context, done) => done(null, context), { useContext: true })",
      "import jayson from \"jayson\"\nconst isArray = new jayson.Method({ handler: (args, done) => done(null, Array.isArray(args)), params: Array })",
    ],
    rejects: [`${JAYSON_LOCAL}\nconst context = jayson.Method((args, context, done) => done(null, context), { useContext: true })`],
  },
  ...jaysonClientFixtures("http"),
  ...jaysonClientFixtures("https"),
  ...jaysonClientFixtures("tcp"),
  ...jaysonClientFixtures("tls"),
]
