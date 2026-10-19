import type { CallPattern, CatalogueLibrary, MethodPattern, Slot } from "@/catalogue/types"

const GRPC_HANDLER_SLOTS: readonly Slot[] = [{ at: [0, "behavior"], runs: "resolver" }]

const GRPC_METHOD_HANDLERS: readonly CallPattern[] = [
  { kind: "call", name: "unary_unary_rpc_method_handler", slots: GRPC_HANDLER_SLOTS, classifies: "server-action" },
  { kind: "call", name: "unary_stream_rpc_method_handler", slots: GRPC_HANDLER_SLOTS, classifies: "server-action" },
  { kind: "call", name: "stream_unary_rpc_method_handler", slots: GRPC_HANDLER_SLOTS, classifies: "server-action" },
  { kind: "call", name: "stream_stream_rpc_method_handler", slots: GRPC_HANDLER_SLOTS, classifies: "server-action" },
]

const GRPC_SERVER_METHODS: readonly MethodPattern[] = [
  { kind: "call", name: "add_generic_rpc_handlers", slots: [], classifies: "server-action" },
]

const GRPC_CHANNEL_METHODS: readonly MethodPattern[] = [
  { kind: "call", name: "unary_unary", slots: [], makes: "request" },
  { kind: "call", name: "unary_stream", slots: [], makes: "request" },
  { kind: "call", name: "stream_unary", slots: [], makes: "request" },
  { kind: "call", name: "stream_stream", slots: [], makes: "request" },
]

export const zerorpcLibrary: CatalogueLibrary = {
  name: "zeroRPC",
  specifiers: ["zerorpc"],
  documentedVersion: "0.6",
  category: "rpc",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "factory", name: "Server", classifies: "server-action", methods: [] },
    { kind: "class", name: "Server", classifies: "server-action", members: [], methods: [] },
    { kind: "factory", name: "Client", makes: "request", methods: [], called: { slots: [], makes: "request" } },
  ],
}

export const rpycLibrary: CatalogueLibrary = {
  name: "RPyC",
  specifiers: ["rpyc"],
  documentedVersion: "6.0",
  category: "rpc",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "class",
      name: "Service",
      classifies: "server-action",
      members: [
        { name: "exposed_*", runs: "resolver" },
        { name: "on_connect", runs: "event" },
        { name: "on_disconnect", runs: "event" },
      ],
      methods: [],
    },
    { kind: "decorator", name: "exposed", runs: "resolver", classifies: "server-action" },
    { kind: "decorator", name: "service", classifies: "server-action" },
    { kind: "call", name: "connect", slots: [], makes: "request" },
  ],
}

export const grpcForPythonLibrary: CatalogueLibrary = {
  name: "gRPC for Python",
  specifiers: ["grpc"],
  documentedVersion: "1.84",
  category: "rpc",
  type: "backend",
  language: "python",
  patterns: [
    ...GRPC_METHOD_HANDLERS,
    { kind: "call", name: "method_handlers_generic_handler", slots: [], classifies: "server-action" },
    { kind: "factory", name: "server", methods: GRPC_SERVER_METHODS },
    { kind: "factory", name: "aio.server", methods: GRPC_SERVER_METHODS },
    { kind: "factory", name: "insecure_channel", makes: "request", methods: GRPC_CHANNEL_METHODS },
    { kind: "factory", name: "secure_channel", makes: "request", methods: GRPC_CHANNEL_METHODS },
  ],
}

export const apacheThriftLibrary: CatalogueLibrary = {
  name: "Apache Thrift",
  specifiers: ["thrift.server.TServer", "thrift.transport.TSocket", "thrift.transport.THttpClient"],
  documentedVersion: "0.25",
  category: "rpc",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "factory", name: "TSimpleServer", classifies: "server-action", methods: [] },
    { kind: "factory", name: "TThreadedServer", classifies: "server-action", methods: [] },
    { kind: "factory", name: "TThreadPoolServer", classifies: "server-action", methods: [] },
    { kind: "factory", name: "TForkingServer", classifies: "server-action", methods: [] },
    { kind: "factory", name: "TSocket", makes: "request", methods: [] },
    { kind: "factory", name: "THttpClient", makes: "request", methods: [] },
  ],
}

export const thriftpy2Library: CatalogueLibrary = {
  name: "thriftpy2",
  specifiers: ["thriftpy2.rpc"],
  documentedVersion: "0.7",
  category: "rpc",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "call", name: "make_server", slots: [], classifies: "server-action" },
    { kind: "call", name: "make_aio_server", slots: [], classifies: "server-action" },
    { kind: "call", name: "make_client", slots: [], makes: "request" },
    { kind: "call", name: "make_aio_client", slots: [], makes: "request" },
  ],
}
