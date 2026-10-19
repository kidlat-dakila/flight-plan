import type { PatternFixture } from "@/catalogue/types"

const ZERORPC = "zeroRPC"
const ZERORPC_COOLER = "class Cooler(object):\n    def add_42(self, n):\n        return n + 42"

export const zerorpcFixtures: readonly PatternFixture[] = [
  {
    library: ZERORPC,
    patternKey: "factory:Server:*",
    matches: [`import zerorpc\n\n${ZERORPC_COOLER}\n\ns = zerorpc.Server(Cooler())\ns.bind("tcp://0.0.0.0:4242")\ns.run()`],
    rejects: [`zerorpc = LocalRegistry()\n\n${ZERORPC_COOLER}\n\ns = zerorpc.Server(Cooler())\ns.run()`],
  },
  {
    library: ZERORPC,
    patternKey: "class:Server:*",
    matches: ["import zerorpc\n\nclass Cooler(zerorpc.Server):\n    def add_42(self, n):\n        return n + 42"],
    rejects: ["class Server(object):\n    pass\n\nclass Cooler(Server):\n    def add_42(self, n):\n        return n + 42"],
  },
  {
    library: ZERORPC,
    patternKey: "factory:Client:*",
    matches: ["import zerorpc\n\nc = zerorpc.Client()\nc.connect(\"tcp://127.0.0.1:4242\")"],
    rejects: ["zerorpc = LocalRegistry()\n\nc = zerorpc.Client()\nc.connect(\"tcp://127.0.0.1:4242\")"],
  },
  {
    library: ZERORPC,
    patternKey: "factory:Client:*>called",
    matches: ["from zerorpc import Client\n\nc = Client(\"tcp://127.0.0.1:4242\")\nresult = c(\"add_42\", 1)"],
    rejects: ["c = LocalClient(\"tcp://127.0.0.1:4242\")\nresult = c(\"add_42\", 1)"],
  },
]

const RPYC = "RPyC"

export const rpycFixtures: readonly PatternFixture[] = [
  {
    library: RPYC,
    patternKey: "class:Service:*",
    matches: ["import rpyc\n\nclass CalculatorService(rpyc.Service):\n    def exposed_add(self, a, b):\n        return a + b\n\n    def on_connect(self, conn):\n        pass"],
    rejects: ["class Service(object):\n    pass\n\nclass CalculatorService(Service):\n    def exposed_add(self, a, b):\n        return a + b"],
  },
  {
    library: RPYC,
    patternKey: "decorator:exposed:*",
    matches: ["import rpyc\n\nclass CalculatorService(rpyc.Service):\n    @rpyc.exposed\n    def add(self, a, b):\n        return a + b"],
    rejects: ["def exposed(function):\n    return function\n\nclass CalculatorService(object):\n    @exposed\n    def add(self, a, b):\n        return a + b"],
  },
  {
    library: RPYC,
    patternKey: "decorator:service:*",
    matches: ["import rpyc\n\n@rpyc.service\nclass CalculatorService(rpyc.Service):\n    @rpyc.exposed\n    def add(self, a, b):\n        return a + b"],
    rejects: ["def service(cls):\n    return cls\n\n@service\nclass CalculatorService(object):\n    def add(self, a, b):\n        return a + b"],
  },
  {
    library: RPYC,
    patternKey: "call:connect:*",
    matches: ["import rpyc\n\nconn = rpyc.connect(\"hostname\", 12345)\nx = conn.root.add(4, 7)"],
    rejects: ["def connect(*parts):\n    return parts\n\nconn = connect(\"hostname\", 12345)"],
  },
]

const GRPC_FOR_PYTHON = "gRPC for Python"
const GRPC_LOCAL = "grpc = LocalRegistry()"

const grpcMethodHandlerFixture = (name: string): PatternFixture => ({
  library: GRPC_FOR_PYTHON,
  patternKey: `call:${name}:*`,
  matches: [`import grpc\n\nhandler = grpc.${name}(\n    servicer.GetFeature,\n    request_deserializer=route__guide__pb2.Point.FromString,\n    response_serializer=route__guide__pb2.Feature.SerializeToString,\n)`],
  rejects: [`${GRPC_LOCAL}\n\nhandler = grpc.${name}(\n    servicer.GetFeature,\n    request_deserializer=route__guide__pb2.Point.FromString,\n)`],
})

const grpcServerFixtures = (factory: string): PatternFixture[] => [
  {
    library: GRPC_FOR_PYTHON,
    patternKey: `factory:${factory}:*`,
    matches: [`import grpc\nfrom concurrent import futures\n\nserver = grpc.${factory}(futures.ThreadPoolExecutor(max_workers=10))`],
    rejects: [`${GRPC_LOCAL}\n\nserver = grpc.${factory}(executor)`],
  },
  {
    library: GRPC_FOR_PYTHON,
    patternKey: `factory:${factory}:*>call:add_generic_rpc_handlers:*`,
    matches: [`import grpc\n\nserver = grpc.${factory}(executor)\nserver.add_generic_rpc_handlers((generic_handler,))`],
    rejects: [`${GRPC_LOCAL}\n\nserver = grpc.${factory}(executor)\nserver.add_generic_rpc_handlers((generic_handler,))`],
  },
]

const grpcChannelFixtures = (factory: string, address: string): PatternFixture[] => [
  {
    library: GRPC_FOR_PYTHON,
    patternKey: `factory:${factory}:*`,
    matches: [`import grpc\n\nwith grpc.${factory}(${address}) as channel:\n    stub = route_guide_pb2_grpc.RouteGuideStub(channel)`],
    rejects: [`${GRPC_LOCAL}\n\nchannel = grpc.${factory}(${address})`],
  },
  ...["unary_unary", "unary_stream", "stream_unary", "stream_stream"].map((method) => ({
    library: GRPC_FOR_PYTHON,
    patternKey: `factory:${factory}:*>call:${method}:*`,
    matches: [`import grpc\n\nchannel = grpc.${factory}(${address})\nget_feature = channel.${method}("/routeguide.RouteGuide/GetFeature")`],
    rejects: [`${GRPC_LOCAL}\n\nchannel = grpc.${factory}(${address})\nget_feature = channel.${method}("/routeguide.RouteGuide/GetFeature")`],
  })),
]

export const grpcForPythonFixtures: readonly PatternFixture[] = [
  grpcMethodHandlerFixture("unary_unary_rpc_method_handler"),
  grpcMethodHandlerFixture("unary_stream_rpc_method_handler"),
  grpcMethodHandlerFixture("stream_unary_rpc_method_handler"),
  grpcMethodHandlerFixture("stream_stream_rpc_method_handler"),
  {
    library: GRPC_FOR_PYTHON,
    patternKey: "call:method_handlers_generic_handler:*",
    matches: ["import grpc\n\ngeneric_handler = grpc.method_handlers_generic_handler(\"routeguide.RouteGuide\", rpc_method_handlers)"],
    rejects: [`${GRPC_LOCAL}\n\ngeneric_handler = grpc.method_handlers_generic_handler("routeguide.RouteGuide", rpc_method_handlers)`],
  },
  ...grpcServerFixtures("server"),
  ...grpcServerFixtures("aio.server"),
  ...grpcChannelFixtures("insecure_channel", "\"localhost:50051\""),
  ...grpcChannelFixtures("secure_channel", "\"localhost:50051\", credentials"),
]

const APACHE_THRIFT = "Apache Thrift"

const thriftServerFixture = (name: string): PatternFixture => ({
  library: APACHE_THRIFT,
  patternKey: `factory:${name}:*`,
  matches: [`from thrift.server import TServer\n\nserver = TServer.${name}(processor, transport, tfactory, pfactory)\nserver.serve()`],
  rejects: [`TServer = LocalRegistry()\n\nserver = TServer.${name}(processor, transport, tfactory, pfactory)`],
})

export const apacheThriftFixtures: readonly PatternFixture[] = [
  thriftServerFixture("TSimpleServer"),
  thriftServerFixture("TThreadedServer"),
  thriftServerFixture("TThreadPoolServer"),
  thriftServerFixture("TForkingServer"),
  {
    library: APACHE_THRIFT,
    patternKey: "factory:TSocket:*",
    matches: ["from thrift.transport import TSocket\n\ntransport = TSocket.TSocket(\"localhost\", 9090)"],
    rejects: ["TSocket = LocalRegistry()\n\ntransport = TSocket.TSocket(\"localhost\", 9090)"],
  },
  {
    library: APACHE_THRIFT,
    patternKey: "factory:THttpClient:*",
    matches: ["from thrift.transport import THttpClient\n\ntransport = THttpClient.THttpClient(\"http://localhost:9090/calculator\")"],
    rejects: ["THttpClient = LocalRegistry()\n\ntransport = THttpClient.THttpClient(\"http://localhost:9090/calculator\")"],
  },
]

const THRIFTPY2 = "thriftpy2"
const THRIFTPY2_LOAD = "pingpong_thrift = thriftpy2.load(\"pingpong.thrift\", module_name=\"pingpong_thrift\")"
const THRIFTPY2_DISPATCHER = "class Dispatcher(object):\n    def ping(self):\n        return \"pong\""

const thriftpy2ServerFixture = (name: string): PatternFixture => ({
  library: THRIFTPY2,
  patternKey: `call:${name}:*`,
  matches: [`import thriftpy2\nfrom thriftpy2.rpc import ${name}\n\n${THRIFTPY2_LOAD}\n\n${THRIFTPY2_DISPATCHER}\n\nserver = ${name}(pingpong_thrift.PingPong, Dispatcher(), "127.0.0.1", 6000)\nserver.serve()`],
  rejects: [`def ${name}(*parts):\n    return parts\n\n${THRIFTPY2_DISPATCHER}\n\nserver = ${name}(pingpong_thrift.PingPong, Dispatcher(), "127.0.0.1", 6000)`],
})

const thriftpy2ClientFixture = (name: string): PatternFixture => ({
  library: THRIFTPY2,
  patternKey: `call:${name}:*`,
  matches: [`import thriftpy2\nfrom thriftpy2.rpc import ${name}\n\n${THRIFTPY2_LOAD}\n\nclient = ${name}(pingpong_thrift.PingPong, "127.0.0.1", 6000)`],
  rejects: [`def ${name}(*parts):\n    return parts\n\nclient = ${name}(pingpong_thrift.PingPong, "127.0.0.1", 6000)`],
})

export const thriftpy2Fixtures: readonly PatternFixture[] = [
  thriftpy2ServerFixture("make_server"),
  thriftpy2ServerFixture("make_aio_server"),
  thriftpy2ClientFixture("make_client"),
  thriftpy2ClientFixture("make_aio_client"),
]
