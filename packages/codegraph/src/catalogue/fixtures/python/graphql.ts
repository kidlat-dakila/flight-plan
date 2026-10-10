import type { PatternFixture } from "@/catalogue/types"

const ARIADNE = "Ariadne"

export const ariadneFixtures: readonly PatternFixture[] = [
  {
    library: ARIADNE,
    patternKey: "factory:QueryType:*",
    matches: [
      "from ariadne import QueryType\n\nquery = QueryType()",
    ],
    rejects: [
      "def QueryType(*parts, **options):\n    return parts\n\nquery = QueryType()",
    ],
  },
  {
    library: ARIADNE,
    patternKey: "factory:QueryType:*>decorator:field:*",
    matches: [
      "from ariadne import QueryType\n\nquery = QueryType()\n\n@query.field(\"people\")\ndef resolve_people(*_):\n    return people",
    ],
    rejects: [
      "query = LocalRegistry()\n\n@query.field(\"people\")\ndef resolve_people(*_):\n    return people",
    ],
  },
  {
    library: ARIADNE,
    patternKey: "factory:ObjectType:*",
    matches: [
      "from ariadne import ObjectType\n\nperson = ObjectType(\"Person\")",
    ],
    rejects: [
      "def ObjectType(*parts, **options):\n    return parts\n\nperson = ObjectType(\"Person\")",
    ],
  },
  {
    library: ARIADNE,
    patternKey: "factory:ObjectType:*>decorator:field:*",
    matches: [
      "from ariadne import ObjectType\n\nperson = ObjectType(\"Person\")\n\n@person.field(\"fullName\")\ndef resolve_person_fullname(person, *_):\n    return person[\"firstName\"]",
    ],
    rejects: [
      "person = LocalRegistry()\n\n@person.field(\"fullName\")\ndef resolve_person_fullname(person, *_):\n    return person[\"firstName\"]",
    ],
  },
  {
    library: ARIADNE,
    patternKey: "call:make_executable_schema:*",
    matches: [
      "from ariadne import make_executable_schema\n\nschema = make_executable_schema(type_defs, query, person)",
    ],
    rejects: [
      "def make_executable_schema(*parts, **options):\n    return parts\n\nschema = make_executable_schema(type_defs, query, person)",
    ],
  },
  {
    library: ARIADNE,
    patternKey: "factory:GraphQL:*",
    matches: [
      "from ariadne.asgi import GraphQL\n\napp = GraphQL(schema, debug=True)",
    ],
    rejects: [
      "def GraphQL(*parts, **options):\n    return parts\n\napp = GraphQL(schema, debug=True)",
    ],
  },
]

const FLASK_GRAPHQL = "Flask-GraphQL"

export const flaskGraphqlFixtures: readonly PatternFixture[] = [
  {
    library: FLASK_GRAPHQL,
    patternKey: "call:GraphQLView.as_view:*",
    matches: [
      "from flask_graphql import GraphQLView\n\napp.add_url_rule(\"/graphql\", view_func=GraphQLView.as_view(\"graphql\", schema=schema, graphiql=True))",
    ],
    rejects: [
      "GraphQLView = LocalRegistry()\n\napp.add_url_rule(\"/graphql\", view_func=GraphQLView.as_view(\"graphql\", schema=schema, graphiql=True))",
    ],
  },
]

const GQL = "gql"

export const gqlFixtures: readonly PatternFixture[] = [
  {
    library: GQL,
    patternKey: "factory:Client:*",
    matches: [
      "from gql import Client\n\nclient = Client(transport=transport)",
    ],
    rejects: [
      "def Client(*parts, **options):\n    return parts\n\nclient = Client(transport=transport)",
    ],
  },
  {
    library: GQL,
    patternKey: "factory:Client:*>call:execute:*",
    matches: [
      "from gql import Client\n\nclient = Client(transport=transport)\n\nresult = client.execute(query)",
    ],
    rejects: [
      "client = LocalRegistry()\n\nresult = client.execute(query)",
    ],
  },
  {
    library: GQL,
    patternKey: "factory:AIOHTTPTransport:*",
    matches: [
      "from gql.transport.aiohttp import AIOHTTPTransport\n\ntransport = AIOHTTPTransport(url=\"https://countries.trevorblades.com/\")",
    ],
    rejects: [
      "def AIOHTTPTransport(*parts, **options):\n    return parts\n\ntransport = AIOHTTPTransport(url=\"https://countries.trevorblades.com/\")",
    ],
  },
]

const GRAPHENE = "Graphene"

export const grapheneFixtures: readonly PatternFixture[] = [
  {
    library: GRAPHENE,
    patternKey: "class:ObjectType:*",
    matches: [
      "from graphene import ObjectType\n\nclass Query(ObjectType):\n    hello = String()\n\n    def resolve_hello(root, info):\n        return \"Hello\"",
    ],
    rejects: [
      "class ObjectType:\n    pass\n\nclass Query(ObjectType):\n    hello = String()\n\n    def resolve_hello(root, info):\n        return \"Hello\"",
    ],
  },
  {
    library: GRAPHENE,
    patternKey: "class:Mutation:*",
    matches: [
      "from graphene import Mutation\n\nclass CreatePerson(Mutation):\n    ok = Boolean()\n\n    def mutate(root, info, name):\n        return CreatePerson(ok=True)",
    ],
    rejects: [
      "class Mutation:\n    pass\n\nclass CreatePerson(Mutation):\n    ok = Boolean()\n\n    def mutate(root, info, name):\n        return CreatePerson(ok=True)",
    ],
  },
  {
    library: GRAPHENE,
    patternKey: "factory:Schema:*",
    matches: [
      "from graphene import Schema\n\nschema = Schema(query=Query)",
    ],
    rejects: [
      "def Schema(*parts, **options):\n    return parts\n\nschema = Schema(query=Query)",
    ],
  },
  {
    library: GRAPHENE,
    patternKey: "factory:Schema:*>call:execute:*",
    matches: [
      "from graphene import Schema\n\nschema = Schema(query=Query)\n\nresult = schema.execute(\"{ hello }\")",
    ],
    rejects: [
      "schema = LocalRegistry()\n\nresult = schema.execute(\"{ hello }\")",
    ],
  },
]

const GRAPHQL_CORE = "GraphQL-core"

export const graphqlCoreFixtures: readonly PatternFixture[] = [
  {
    library: GRAPHQL_CORE,
    patternKey: "call:graphql_sync:*",
    matches: [
      "from graphql import graphql_sync\n\nresult = graphql_sync(schema, \"{ hello }\")",
    ],
    rejects: [
      "def graphql_sync(*parts, **options):\n    return parts\n\nresult = graphql_sync(schema, \"{ hello }\")",
    ],
  },
  {
    library: GRAPHQL_CORE,
    patternKey: "call:graphql:*",
    matches: [
      "from graphql import graphql\n\nresult = await graphql(schema, \"{ hello }\")",
    ],
    rejects: [
      "def graphql(*parts, **options):\n    return parts\n\nresult = await graphql(schema, \"{ hello }\")",
    ],
  },
  {
    library: GRAPHQL_CORE,
    patternKey: "factory:GraphQLField:*",
    matches: [
      "from graphql import GraphQLField\n\nfield = GraphQLField(GraphQLString, resolve=resolve_hello)",
    ],
    rejects: [
      "def GraphQLField(*parts, **options):\n    return parts\n\nfield = GraphQLField(GraphQLString, resolve=resolve_hello)",
    ],
  },
]

const SGQLC = "sgqlc"

export const sgqlcFixtures: readonly PatternFixture[] = [
  {
    library: SGQLC,
    patternKey: "factory:HTTPEndpoint:*",
    matches: [
      "from sgqlc.endpoint.http import HTTPEndpoint\n\nendpoint = HTTPEndpoint(url, headers)",
    ],
    rejects: [
      "def HTTPEndpoint(*parts, **options):\n    return parts\n\nendpoint = HTTPEndpoint(url, headers)",
    ],
  },
  {
    library: SGQLC,
    patternKey: "factory:HTTPEndpoint:*>called",
    matches: [
      "from sgqlc.endpoint.http import HTTPEndpoint\n\nendpoint = HTTPEndpoint(url, headers)\n\ndata = endpoint(query, variables)",
    ],
    rejects: [
      "endpoint = LocalRegistry()\n\ndata = endpoint(query, variables)",
    ],
  },
  {
    library: SGQLC,
    patternKey: "factory:Operation:*",
    matches: [
      "from sgqlc.operation import Operation\n\nop = Operation(Query)",
    ],
    rejects: [
      "def Operation(*parts, **options):\n    return parts\n\nop = Operation(Query)",
    ],
  },
]

const STRAWBERRY = "Strawberry"

export const strawberryFixtures: readonly PatternFixture[] = [
  {
    library: STRAWBERRY,
    patternKey: "decorator:field:*",
    matches: [
      "from strawberry import field\n\n@type\nclass Query:\n    @field\n    def hello(self) -> str:\n        return \"Hello World\"",
    ],
    rejects: [
      "def field(*parts, **options):\n    return parts\n\n@type\nclass Query:\n    @field\n    def hello(self) -> str:\n        return \"Hello World\"",
    ],
  },
  {
    library: STRAWBERRY,
    patternKey: "decorator:type:*",
    matches: [
      "from strawberry import type\n\n@type\nclass Query:\n    name: str",
    ],
    rejects: [
      "def type(*parts, **options):\n    return parts\n\n@type\nclass Query:\n    name: str",
    ],
  },
  {
    library: STRAWBERRY,
    patternKey: "factory:Schema:*",
    matches: [
      "from strawberry import Schema\n\nschema = Schema(query=Query)",
    ],
    rejects: [
      "def Schema(*parts, **options):\n    return parts\n\nschema = Schema(query=Query)",
    ],
  },
]

const TARTIFLETTE = "Tartiflette"

export const tartifletteFixtures: readonly PatternFixture[] = [
  {
    library: TARTIFLETTE,
    patternKey: "decorator:Resolver:*",
    matches: [
      "from tartiflette import Resolver\n\n@Resolver(\"Query.hello\")\nasync def resolver_hello(parent, args, ctx, info):\n    return \"hello \" + args[\"name\"]",
    ],
    rejects: [
      "def Resolver(*parts, **options):\n    return parts\n\n@Resolver(\"Query.hello\")\nasync def resolver_hello(parent, args, ctx, info):\n    return \"hello \" + args[\"name\"]",
    ],
  },
  {
    library: TARTIFLETTE,
    patternKey: "factory:create_engine:*",
    matches: [
      "from tartiflette import create_engine\n\nengine = await create_engine(\"type Query { hello(name: String): String }\")",
    ],
    rejects: [
      "def create_engine(*parts, **options):\n    return parts\n\nengine = await create_engine(\"type Query { hello(name: String): String }\")",
    ],
  },
  {
    library: TARTIFLETTE,
    patternKey: "factory:create_engine:*>call:execute:*",
    matches: [
      "from tartiflette import create_engine\n\nengine = await create_engine(\"type Query { hello(name: String): String }\")\n\nresult = await engine.execute(query=\"query { hello(name: \\\"Chuck\\\") }\")",
    ],
    rejects: [
      "engine = LocalRegistry()\n\nresult = await engine.execute(query=\"query { hello(name: \\\"Chuck\\\") }\")",
    ],
  },
]

const TARTIFLETTE_AIOHTTP = "tartiflette-aiohttp"

export const tartifletteAiohttpFixtures: readonly PatternFixture[] = [
  {
    library: TARTIFLETTE_AIOHTTP,
    patternKey: "call:register_graphql_handlers:*",
    matches: [
      "from tartiflette_aiohttp import register_graphql_handlers\n\nweb.run_app(register_graphql_handlers(web.Application(), engine_sdl=sdl))",
    ],
    rejects: [
      "def register_graphql_handlers(*parts, **options):\n    return parts\n\nweb.run_app(register_graphql_handlers(web.Application(), engine_sdl=sdl))",
    ],
  },
]

const TARTIFLETTE_ASGI = "tartiflette-asgi"

export const tartifletteAsgiFixtures: readonly PatternFixture[] = [
  {
    library: TARTIFLETTE_ASGI,
    patternKey: "factory:TartifletteApp:*",
    matches: [
      "from tartiflette_asgi import TartifletteApp\n\napp = TartifletteApp(sdl=sdl, path=\"/graphql\")",
    ],
    rejects: [
      "def TartifletteApp(*parts, **options):\n    return parts\n\napp = TartifletteApp(sdl=sdl, path=\"/graphql\")",
    ],
  },
]
