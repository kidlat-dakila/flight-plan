import type { CatalogueLibrary } from "@/catalogue/types"

export const apolloServerLibrary: CatalogueLibrary = {
  name: "Apollo Server",
  specifiers: ["@apollo/server", "@apollo/server/standalone", "@apollo/server/express4", "apollo-server-express"],
  documentedVersion: "5.5",
  category: "graphql",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "ApolloServer",
      slots: [{ at: "resolvers.*.*", runs: "resolver" }],
      methods: [
        { kind: "call", name: "start", slots: [], makes: "config" },
      ],
    },
    { kind: "call", name: "startStandaloneServer", slots: [{ at: "1.context", runs: "middleware" }] },
    { kind: "call", name: "expressMiddleware", slots: [{ at: "1.context", runs: "middleware" }] },
  ],
}

export const graffleLibrary: CatalogueLibrary = {
  name: "Graffle",
  specifiers: ["graffle", "graphql-request"],
  documentedVersion: "0.0",
  category: "graphql",
  type: "fullstack",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "Graffle.create",
      methods: [
        { kind: "call", name: "gql", slots: [], makes: "request" },
      ],
    },
    {
      kind: "factory",
      name: "GraphQLClient",
      makes: "request",
      prefixAt: 0,
      methods: [],
    },
  ],
}

export const graphqlJsLibrary: CatalogueLibrary = {
  name: "GraphQL.js",
  specifiers: ["graphql"],
  documentedVersion: "17.0",
  category: "graphql",
  type: "backend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "graphql", slots: [{ at: "rootValue.*", runs: "resolver" }], makes: "request" },
    { kind: "call", name: "buildSchema", slots: [], makes: "config" },
    {
      kind: "factory",
      name: "GraphQLObjectType",
      slots: [{ at: "fields.*.resolve", runs: "resolver" }],
      methods: [],
    },
    { kind: "call", name: "execute", slots: [], makes: "request" },
  ],
}

export const graphqlShieldLibrary: CatalogueLibrary = {
  name: "GraphQL Shield",
  specifiers: ["graphql-shield"],
  documentedVersion: "7.6",
  category: "graphql",
  type: "backend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "shield", slots: [], makes: "auth" },
    { kind: "call", name: "rule", slots: [], makes: "auth" },
  ],
}

export const graphqlToolsLibrary: CatalogueLibrary = {
  name: "graphql-tools",
  specifiers: ["@graphql-tools/schema", "@graphql-tools/merge"],
  documentedVersion: "10.1",
  category: "graphql",
  type: "backend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "makeExecutableSchema", slots: [{ at: "resolvers.*.*", runs: "resolver" }] },
    { kind: "call", name: "addResolversToSchema", slots: [{ at: "resolvers.*.*", runs: "resolver" }] },
    { kind: "call", name: "mergeResolvers", slots: [], makes: "config" },
  ],
}

export const graphqlYogaLibrary: CatalogueLibrary = {
  name: "graphql-yoga",
  specifiers: ["graphql-yoga"],
  documentedVersion: "5.24",
  category: "graphql",
  type: "backend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "createSchema", slots: [{ at: "resolvers.*.*", runs: "resolver" }] },
    { kind: "call", name: "createYoga", slots: [{ at: "context", runs: "middleware" }] },
  ],
}

export const mercuriusLibrary: CatalogueLibrary = {
  name: "Mercurius",
  specifiers: ["mercurius"],
  documentedVersion: "16.11",
  category: "graphql",
  type: "backend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "default", slots: [], makes: "config" },
  ],
}

export const nexusLibrary: CatalogueLibrary = {
  name: "Nexus",
  specifiers: ["nexus"],
  documentedVersion: "1.3",
  category: "graphql",
  type: "backend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "objectType", slots: [{ at: "definition", runs: "in-place" }] },
    { kind: "call", name: "extendType", slots: [{ at: "definition", runs: "in-place" }] },
    { kind: "call", name: "makeSchema", slots: [], makes: "config" },
  ],
}

export const pothosLibrary: CatalogueLibrary = {
  name: "Pothos",
  specifiers: ["@pothos/core"],
  documentedVersion: "4.15",
  category: "graphql",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "default",
      methods: [
        { kind: "call", name: "queryType", slots: [{ at: "fields", runs: "in-place" }] },
        { kind: "call", name: "queryFields", slots: [{ at: 0, runs: "in-place" }] },
        { kind: "call", name: "mutationFields", slots: [{ at: 0, runs: "in-place" }] },
        { kind: "call", name: "field", slots: [{ at: "resolve", runs: "resolver" }] },
        { kind: "call", name: "toSchema", slots: [], makes: "config" },
      ],
    },
  ],
}

export const typegraphqlLibrary: CatalogueLibrary = {
  name: "TypeGraphQL",
  specifiers: ["type-graphql"],
  documentedVersion: "2.0",
  category: "graphql",
  type: "backend",
  language: "javascript",
  patterns: [
    { kind: "decorator", name: "Query", runs: "resolver" },
    { kind: "decorator", name: "Mutation", runs: "resolver" },
    { kind: "decorator", name: "Authorized", makes: "auth" },
    { kind: "call", name: "buildSchema", slots: [], makes: "config" },
  ],
}
