import type { CatalogueLibrary } from "@/catalogue/types"

export const ariadneLibrary: CatalogueLibrary = {
  name: "Ariadne",
  specifiers: ["ariadne", "ariadne.asgi"],
  documentedVersion: "1.1",
  category: "graphql",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "QueryType",
      methods: [
        { kind: "decorator", name: "field", runs: "resolver", eventAt: 0 },
      ],
    },
    {
      kind: "factory",
      name: "ObjectType",
      methods: [
        { kind: "decorator", name: "field", runs: "resolver", eventAt: 0 },
      ],
    },
    { kind: "call", name: "make_executable_schema", slots: [], makes: "config" },
    {
      kind: "factory",
      name: "GraphQL",
      makes: "config",
      methods: [],
    },
  ],
}

export const flaskGraphqlLibrary: CatalogueLibrary = {
  name: "Flask-GraphQL",
  specifiers: ["flask_graphql"],
  documentedVersion: "2.0",
  category: "graphql",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "call", name: "GraphQLView.as_view", slots: [], makes: "config" },
  ],
}

export const gqlLibrary: CatalogueLibrary = {
  name: "gql",
  specifiers: ["gql", "gql.transport.aiohttp"],
  documentedVersion: "4.4",
  category: "graphql",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "Client",
      methods: [
        { kind: "call", name: "execute", slots: [], makes: "request" },
      ],
    },
    {
      kind: "factory",
      name: "AIOHTTPTransport",
      makes: "request",
      prefixAt: "url",
      methods: [],
    },
  ],
}

export const grapheneLibrary: CatalogueLibrary = {
  name: "Graphene",
  specifiers: ["graphene"],
  documentedVersion: "3.4",
  category: "graphql",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "class",
      name: "ObjectType",
      members: [{ name: "resolve_*", runs: "resolver" }],
      methods: [],
    },
    {
      kind: "class",
      name: "Mutation",
      members: [{ name: "mutate", runs: "resolver" }],
      methods: [],
    },
    {
      kind: "factory",
      name: "Schema",
      methods: [
        { kind: "call", name: "execute", slots: [], makes: "request" },
      ],
    },
  ],
}

export const graphqlCoreLibrary: CatalogueLibrary = {
  name: "GraphQL-core",
  specifiers: ["graphql"],
  documentedVersion: "3.3",
  category: "graphql",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "call", name: "graphql_sync", slots: [], makes: "request" },
    { kind: "call", name: "graphql", slots: [], makes: "request" },
    {
      kind: "factory",
      name: "GraphQLField",
      slots: [{ at: "resolve", runs: "resolver" }],
      methods: [],
    },
  ],
}

export const sgqlcLibrary: CatalogueLibrary = {
  name: "sgqlc",
  specifiers: ["sgqlc", "sgqlc.endpoint.http", "sgqlc.operation"],
  documentedVersion: "18",
  category: "graphql",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "HTTPEndpoint",
      prefixAt: 0,
      methods: [],
      called: {
        slots: [],
        makes: "request",
      },
    },
    {
      kind: "factory",
      name: "Operation",
      makes: "request",
      methods: [],
    },
  ],
}

export const strawberryLibrary: CatalogueLibrary = {
  name: "Strawberry",
  specifiers: ["strawberry"],
  documentedVersion: "0.332",
  category: "graphql",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "decorator", name: "field", runs: "resolver" },
    { kind: "decorator", name: "type", makes: "validation" },
    {
      kind: "factory",
      name: "Schema",
      makes: "config",
      methods: [],
    },
  ],
}

export const tartifletteLibrary: CatalogueLibrary = {
  name: "Tartiflette",
  specifiers: ["tartiflette"],
  documentedVersion: "1.4",
  category: "graphql",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "decorator", name: "Resolver", runs: "resolver", eventAt: 0 },
    {
      kind: "factory",
      name: "create_engine",
      methods: [
        { kind: "call", name: "execute", slots: [], makes: "request" },
      ],
    },
  ],
}

export const tartifletteAiohttpLibrary: CatalogueLibrary = {
  name: "tartiflette-aiohttp",
  specifiers: ["tartiflette_aiohttp"],
  documentedVersion: "1.4",
  category: "graphql",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "call", name: "register_graphql_handlers", slots: [], makes: "config" },
  ],
}

export const tartifletteAsgiLibrary: CatalogueLibrary = {
  name: "tartiflette-asgi",
  specifiers: ["tartiflette_asgi"],
  documentedVersion: "0.12",
  category: "graphql",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "TartifletteApp",
      makes: "config",
      prefixAt: "path",
      methods: [],
    },
  ],
}
