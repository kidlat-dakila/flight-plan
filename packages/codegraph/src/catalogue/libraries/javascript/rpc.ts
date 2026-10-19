import type { CallPattern, CatalogueLibrary, MethodPattern, Slot } from "@/catalogue/types"

const JSON_RPC_2_SERVER_METHODS: readonly CallPattern[] = [
  { kind: "call", name: "addMethod", slots: [{ at: 1, runs: "resolver" }], classifies: "server-action" },
  { kind: "call", name: "addMethodAdvanced", slots: [{ at: 1, runs: "resolver" }], classifies: "server-action" },
]

const JSON_RPC_2_CLIENT_METHODS: readonly CallPattern[] = [
  { kind: "call", name: "request", slots: [], makes: "request" },
  { kind: "call", name: "requestAdvanced", slots: [], makes: "request" },
  { kind: "call", name: "notify", slots: [], makes: "request" },
]

const JAYSON_SERVER_METHODS: readonly MethodPattern[] = [
  { kind: "call", name: "method", slots: [{ at: 1, runs: "resolver" }], classifies: "server-action" },
  { kind: "call", name: "methods", slots: [{ at: "0.*", runs: "resolver" }], classifies: "server-action" },
]

const JAYSON_CLIENT_METHODS: readonly MethodPattern[] = [
  { kind: "call", name: "request", slots: [], makes: "request" },
]

const JAYSON_METHOD_SLOTS: readonly Slot[] = [{ at: 0, runs: "resolver" }, { at: "0.handler", runs: "resolver" }]

export const grpcForNodeJsLibrary: CatalogueLibrary = {
  name: "gRPC for Node.js",
  specifiers: ["@grpc/grpc-js"],
  documentedVersion: "1.14",
  category: "rpc",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "Server",
      methods: [
        { kind: "call", name: "addService", slots: [{ at: "1.*", runs: "resolver" }], classifies: "server-action" },
        { kind: "call", name: "register", slots: [{ at: 1, runs: "resolver" }], classifies: "server-action" },
      ],
    },
    {
      kind: "factory",
      name: "Client",
      methods: [
        { kind: "call", name: "makeUnaryRequest", slots: [], makes: "request" },
        { kind: "call", name: "makeClientStreamRequest", slots: [], makes: "request" },
        { kind: "call", name: "makeServerStreamRequest", slots: [], makes: "request" },
        { kind: "call", name: "makeBidiStreamRequest", slots: [], makes: "request" },
      ],
    },
  ],
}

export const jsonRpc2Library: CatalogueLibrary = {
  name: "JSON-RPC 2.0",
  specifiers: ["json-rpc-2.0"],
  documentedVersion: "1.8",
  category: "rpc",
  type: "fullstack",
  language: "javascript",
  patterns: [
    { kind: "factory", name: "JSONRPCServer", methods: JSON_RPC_2_SERVER_METHODS },
    { kind: "factory", name: "JSONRPCClient", methods: JSON_RPC_2_CLIENT_METHODS },
    { kind: "factory", name: "JSONRPCServerAndClient", methods: [...JSON_RPC_2_SERVER_METHODS, ...JSON_RPC_2_CLIENT_METHODS] },
  ],
}

export const connectRpcLibrary: CatalogueLibrary = {
  name: "Connect RPC",
  specifiers: ["@connectrpc/connect"],
  documentedVersion: "2.2",
  category: "rpc",
  type: "fullstack",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "ConnectRouter",
      isTypeOnly: true,
      makesType: "ConnectRouter",
      methods: [
        { kind: "call", name: "service", slots: [{ at: "1.*", runs: "resolver" }], classifies: "server-action" },
        { kind: "call", name: "rpc", slots: [{ at: 1, runs: "resolver" }], classifies: "server-action" },
      ],
    },
    { kind: "factory", name: "createClient", makes: "request", methods: [] },
    { kind: "factory", name: "createPromiseClient", makes: "request", methods: [] },
  ],
}

export const jaysonLibrary: CatalogueLibrary = {
  name: "Jayson",
  specifiers: ["jayson", "jayson/promise"],
  documentedVersion: "5.0",
  category: "rpc",
  type: "fullstack",
  language: "javascript",
  patterns: [
    { kind: "factory", name: "server", slots: [{ at: "0.*", runs: "resolver" }], classifies: "server-action", methods: JAYSON_SERVER_METHODS },
    { kind: "factory", name: "Server", slots: [{ at: "0.*", runs: "resolver" }], classifies: "server-action", methods: JAYSON_SERVER_METHODS },
    { kind: "factory", name: "Method", slots: JAYSON_METHOD_SLOTS, classifies: "server-action", methods: [] },
    { kind: "factory", name: "client.http", methods: JAYSON_CLIENT_METHODS },
    { kind: "factory", name: "client.https", methods: JAYSON_CLIENT_METHODS },
    { kind: "factory", name: "client.tcp", methods: JAYSON_CLIENT_METHODS },
    { kind: "factory", name: "client.tls", methods: JAYSON_CLIENT_METHODS },
  ],
}
