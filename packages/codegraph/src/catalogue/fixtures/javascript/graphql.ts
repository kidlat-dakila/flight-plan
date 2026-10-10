import type { PatternFixture } from "@/catalogue/types"

const APOLLO_SERVER = "Apollo Server"

export const apolloServerFixtures: readonly PatternFixture[] = [
  {
    library: APOLLO_SERVER,
    patternKey: "factory:ApolloServer:*",
    matches: [
      "import { ApolloServer } from \"@apollo/server\"\nconst server = new ApolloServer({ typeDefs, resolvers: { Query: { books: () => books } } })",
    ],
    rejects: [
      "const ApolloServer = (...parts) => parts\nconst server = new ApolloServer({ typeDefs, resolvers: { Query: { books: () => books } } })",
    ],
  },
  {
    library: APOLLO_SERVER,
    patternKey: "factory:ApolloServer:*>call:start:*",
    matches: [
      "import { ApolloServer } from \"@apollo/server\"\nconst server = new ApolloServer({ typeDefs, resolvers: { Query: { books: () => books } } })\nawait server.start()",
    ],
    rejects: [
      "const server = makeLocalRegistry()\nawait server.start()",
    ],
  },
  {
    library: APOLLO_SERVER,
    patternKey: "call:startStandaloneServer:*",
    matches: [
      "import { startStandaloneServer } from \"@apollo/server/standalone\"\nconst { url } = await startStandaloneServer(server, { context: async ({ req }) => ({ token: getTokenForRequest(req) }) })",
    ],
    rejects: [
      "const startStandaloneServer = (...parts) => parts\nconst { url } = await startStandaloneServer(server, { context: async ({ req }) => ({ token: getTokenForRequest(req) }) })",
    ],
  },
  {
    library: APOLLO_SERVER,
    patternKey: "call:expressMiddleware:*",
    matches: [
      "import { expressMiddleware } from \"@apollo/server/express4\"\napp.use(\"/graphql\", expressMiddleware(server, { context: async ({ req }) => ({ token: req.headers.token }) }))",
    ],
    rejects: [
      "const expressMiddleware = (...parts) => parts\napp.use(\"/graphql\", expressMiddleware(server, { context: async ({ req }) => ({ token: req.headers.token }) }))",
    ],
  },
]

const GRAFFLE = "Graffle"

export const graffleFixtures: readonly PatternFixture[] = [
  {
    library: GRAFFLE,
    patternKey: "factory:Graffle.create:*",
    matches: [
      "import { Graffle } from \"graffle\"\nconst graffle = Graffle.create().transport({ url: \"https://graphql-pokemon.vercel.app/api/graphql\" })",
    ],
    rejects: [
      "const Graffle = makeLocalRegistry()\nconst graffle = Graffle.create().transport({ url: \"https://graphql-pokemon.vercel.app/api/graphql\" })",
    ],
  },
  {
    library: GRAFFLE,
    patternKey: "factory:Graffle.create:*>call:gql:*",
    matches: [
      "import { Graffle } from \"graffle\"\nconst graffle = Graffle.create().transport({ url: \"https://graphql-pokemon.vercel.app/api/graphql\" })\nconst data = await graffle.gql(\"query { pokemons { name } }\").send()",
    ],
    rejects: [
      "const graffle = makeLocalRegistry()\nconst data = await graffle.gql(\"query { pokemons { name } }\").send()",
    ],
  },
  {
    library: GRAFFLE,
    patternKey: "factory:GraphQLClient:*",
    matches: [
      "import { GraphQLClient } from \"graphql-request\"\nconst client = new GraphQLClient(\"https://api.example.com/graphql\")",
    ],
    rejects: [
      "const GraphQLClient = (...parts) => parts\nconst client = new GraphQLClient(\"https://api.example.com/graphql\")",
    ],
  },
]

const GRAPHQL_JS = "GraphQL.js"

export const graphqlJsFixtures: readonly PatternFixture[] = [
  {
    library: GRAPHQL_JS,
    patternKey: "call:graphql:*",
    matches: [
      "import { graphql } from \"graphql\"\nconst result = await graphql({ schema, source: \"{ hello }\", rootValue })",
    ],
    rejects: [
      "const graphql = (...parts) => parts\nconst result = await graphql({ schema, source: \"{ hello }\", rootValue })",
    ],
  },
  {
    library: GRAPHQL_JS,
    patternKey: "call:buildSchema:*",
    matches: [
      "import { buildSchema } from \"graphql\"\nconst schema = buildSchema(\"type Query { hello: String }\")",
    ],
    rejects: [
      "const buildSchema = (...parts) => parts\nconst schema = buildSchema(\"type Query { hello: String }\")",
    ],
  },
  {
    library: GRAPHQL_JS,
    patternKey: "factory:GraphQLObjectType:*",
    matches: [
      "import { GraphQLObjectType } from \"graphql\"\nconst queryType = new GraphQLObjectType({ name: \"Query\", fields: { user: { type: userType, resolve: (_, { id }) => findUser(id) } } })",
    ],
    rejects: [
      "const GraphQLObjectType = (...parts) => parts\nconst queryType = new GraphQLObjectType({ name: \"Query\", fields: { user: { type: userType, resolve: (_, { id }) => findUser(id) } } })",
    ],
  },
  {
    library: GRAPHQL_JS,
    patternKey: "call:execute:*",
    matches: [
      "import { execute } from \"graphql\"\nconst result = await execute({ schema, document })",
    ],
    rejects: [
      "const execute = (...parts) => parts\nconst result = await execute({ schema, document })",
    ],
  },
]

const GRAPHQL_SHIELD = "GraphQL Shield"

export const graphqlShieldFixtures: readonly PatternFixture[] = [
  {
    library: GRAPHQL_SHIELD,
    patternKey: "call:shield:*",
    matches: [
      "import { shield } from \"graphql-shield\"\nconst permissions = shield({ Query: { users: isAuthenticated } })",
    ],
    rejects: [
      "const shield = (...parts) => parts\nconst permissions = shield({ Query: { users: isAuthenticated } })",
    ],
  },
  {
    library: GRAPHQL_SHIELD,
    patternKey: "call:rule:*",
    matches: [
      "import { rule } from \"graphql-shield\"\nconst isAuthenticated = rule()(async (parent, args, ctx) => ctx.user !== null)",
    ],
    rejects: [
      "const rule = (...parts) => parts\nconst isAuthenticated = rule()(async (parent, args, ctx) => ctx.user !== null)",
    ],
  },
]

const GRAPHQL_TOOLS = "graphql-tools"

export const graphqlToolsFixtures: readonly PatternFixture[] = [
  {
    library: GRAPHQL_TOOLS,
    patternKey: "call:makeExecutableSchema:*",
    matches: [
      "import { makeExecutableSchema } from \"@graphql-tools/schema\"\nconst schema = makeExecutableSchema({ typeDefs, resolvers: { Query: { author: (_, { id }) => Author.find(id) } } })",
    ],
    rejects: [
      "const makeExecutableSchema = (...parts) => parts\nconst schema = makeExecutableSchema({ typeDefs, resolvers: { Query: { author: (_, { id }) => Author.find(id) } } })",
    ],
  },
  {
    library: GRAPHQL_TOOLS,
    patternKey: "call:addResolversToSchema:*",
    matches: [
      "import { addResolversToSchema } from \"@graphql-tools/schema\"\nconst schemaWithResolvers = addResolversToSchema({ schema, resolvers })",
    ],
    rejects: [
      "const addResolversToSchema = (...parts) => parts\nconst schemaWithResolvers = addResolversToSchema({ schema, resolvers })",
    ],
  },
  {
    library: GRAPHQL_TOOLS,
    patternKey: "call:mergeResolvers:*",
    matches: [
      "import { mergeResolvers } from \"@graphql-tools/merge\"\nconst resolvers = mergeResolvers([userResolvers, postResolvers])",
    ],
    rejects: [
      "const mergeResolvers = (...parts) => parts\nconst resolvers = mergeResolvers([userResolvers, postResolvers])",
    ],
  },
]

const GRAPHQL_YOGA = "graphql-yoga"

export const graphqlYogaFixtures: readonly PatternFixture[] = [
  {
    library: GRAPHQL_YOGA,
    patternKey: "call:createSchema:*",
    matches: [
      "import { createSchema } from \"graphql-yoga\"\nconst schema = createSchema({ typeDefs, resolvers: { Query: { hello: () => \"world\" } } })",
    ],
    rejects: [
      "const createSchema = (...parts) => parts\nconst schema = createSchema({ typeDefs, resolvers: { Query: { hello: () => \"world\" } } })",
    ],
  },
  {
    library: GRAPHQL_YOGA,
    patternKey: "call:createYoga:*",
    matches: [
      "import { createYoga } from \"graphql-yoga\"\nconst yoga = createYoga({ schema })",
    ],
    rejects: [
      "const createYoga = (...parts) => parts\nconst yoga = createYoga({ schema })",
    ],
  },
]

const MERCURIUS = "Mercurius"

export const mercuriusFixtures: readonly PatternFixture[] = [
  {
    library: MERCURIUS,
    patternKey: "call:default:*",
    matches: [
      "import mercurius from \"mercurius\"\napp.register(mercurius, { schema, resolvers: { Query: { add: async (_, { x, y }) => x + y } } })",
    ],
    rejects: [
      "const mercurius = (...parts) => parts\napp.register(mercurius, { schema, resolvers: { Query: { add: async (_, { x, y }) => x + y } } })",
    ],
  },
]

const NEXUS = "Nexus"

export const nexusFixtures: readonly PatternFixture[] = [
  {
    library: NEXUS,
    patternKey: "call:objectType:*",
    matches: [
      "import { objectType } from \"nexus\"\nconst User = objectType({ name: \"User\", definition(t) { t.string(\"name\") } })",
    ],
    rejects: [
      "const objectType = (...parts) => parts\nconst User = objectType({ name: \"User\", definition(t) { t.string(\"name\") } })",
    ],
  },
  {
    library: NEXUS,
    patternKey: "call:extendType:*",
    matches: [
      "import { extendType } from \"nexus\"\nconst usersQueryField = extendType({ type: \"Query\", definition(t) { t.field(\"users\", { type: \"User\", resolve: () => listUsers() }) } })",
    ],
    rejects: [
      "const extendType = (...parts) => parts\nconst usersQueryField = extendType({ type: \"Query\", definition(t) { t.field(\"users\", { type: \"User\", resolve: () => listUsers() }) } })",
    ],
  },
  {
    library: NEXUS,
    patternKey: "call:makeSchema:*",
    matches: [
      "import { makeSchema } from \"nexus\"\nconst schema = makeSchema({ types: [User, usersQueryField] })",
    ],
    rejects: [
      "const makeSchema = (...parts) => parts\nconst schema = makeSchema({ types: [User, usersQueryField] })",
    ],
  },
]

const POTHOS = "Pothos"

export const pothosFixtures: readonly PatternFixture[] = [
  {
    library: POTHOS,
    patternKey: "factory:default:*",
    matches: [
      "import SchemaBuilder from \"@pothos/core\"\nconst builder = new SchemaBuilder({})",
    ],
    rejects: [
      "const SchemaBuilder = (...parts) => parts\nconst builder = new SchemaBuilder({})",
    ],
  },
  {
    library: POTHOS,
    patternKey: "factory:default:*>call:queryType:*",
    matches: [
      "import SchemaBuilder from \"@pothos/core\"\nconst builder = new SchemaBuilder({})\nbuilder.queryType({ fields: (t) => ({ hello: t.string({ resolve: () => \"world\" }) }) })",
    ],
    rejects: [
      "const builder = makeLocalRegistry()\nbuilder.queryType({ fields: (t) => ({ hello: t.string({ resolve: () => \"world\" }) }) })",
    ],
  },
  {
    library: POTHOS,
    patternKey: "factory:default:*>call:queryFields:*",
    matches: [
      "import SchemaBuilder from \"@pothos/core\"\nconst builder = new SchemaBuilder({})\nbuilder.queryFields((t) => ({ posts: t.field({ type: [Post], resolve: () => listPosts() }) }))",
    ],
    rejects: [
      "const builder = makeLocalRegistry()\nbuilder.queryFields((t) => ({ posts: t.field({ type: [Post], resolve: () => listPosts() }) }))",
    ],
  },
  {
    library: POTHOS,
    patternKey: "factory:default:*>call:mutationFields:*",
    matches: [
      "import SchemaBuilder from \"@pothos/core\"\nconst builder = new SchemaBuilder({})\nbuilder.mutationFields((t) => ({ createPost: t.field({ type: Post, resolve: (root, args) => createPost(args) }) }))",
    ],
    rejects: [
      "const builder = makeLocalRegistry()\nbuilder.mutationFields((t) => ({ createPost: t.field({ type: Post, resolve: (root, args) => createPost(args) }) }))",
    ],
  },
  {
    library: POTHOS,
    patternKey: "factory:default:*>call:field:*",
    matches: [
      "import SchemaBuilder from \"@pothos/core\"\nconst builder = new SchemaBuilder({})\nbuilder.queryFields((t) => ({ posts: t.field({ type: [Post], resolve: () => listPosts() }) }))",
    ],
    rejects: [
      "const builder = makeLocalRegistry()\nbuilder.queryFields((t) => ({ posts: t.field({ type: [Post], resolve: () => listPosts() }) }))",
    ],
  },
  {
    library: POTHOS,
    patternKey: "factory:default:*>call:toSchema:*",
    matches: [
      "import SchemaBuilder from \"@pothos/core\"\nconst builder = new SchemaBuilder({})\nexport const schema = builder.toSchema()",
    ],
    rejects: [
      "const builder = makeLocalRegistry()\nexport const schema = builder.toSchema()",
    ],
  },
]

const TYPEGRAPHQL = "TypeGraphQL"

export const typegraphqlFixtures: readonly PatternFixture[] = [
  {
    library: TYPEGRAPHQL,
    patternKey: "decorator:Query:*",
    matches: [
      "import { Query } from \"type-graphql\"\n@Resolver()\nclass RecipeResolver {\n  @Query(() => [Recipe])\n  recipes() { return listRecipes() }\n}",
    ],
    rejects: [
      "const Query = (...parts) => parts\n@Resolver()\nclass RecipeResolver {\n  @Query(() => [Recipe])\n  recipes() { return listRecipes() }\n}",
    ],
  },
  {
    library: TYPEGRAPHQL,
    patternKey: "decorator:Mutation:*",
    matches: [
      "import { Mutation } from \"type-graphql\"\n@Resolver()\nclass RecipeResolver {\n  @Mutation(() => Recipe)\n  addRecipe(@Arg(\"title\") title) { return addRecipe(title) }\n}",
    ],
    rejects: [
      "const Mutation = (...parts) => parts\n@Resolver()\nclass RecipeResolver {\n  @Mutation(() => Recipe)\n  addRecipe(@Arg(\"title\") title) { return addRecipe(title) }\n}",
    ],
  },
  {
    library: TYPEGRAPHQL,
    patternKey: "decorator:Authorized:*",
    matches: [
      "import { Authorized } from \"type-graphql\"\n@Resolver()\nclass RecipeResolver {\n  @Authorized(\"ADMIN\")\n  @Mutation(() => Boolean)\n  deleteRecipe() { return true }\n}",
    ],
    rejects: [
      "const Authorized = (...parts) => parts\n@Resolver()\nclass RecipeResolver {\n  @Authorized(\"ADMIN\")\n  @Mutation(() => Boolean)\n  deleteRecipe() { return true }\n}",
    ],
  },
  {
    library: TYPEGRAPHQL,
    patternKey: "call:buildSchema:*",
    matches: [
      "import { buildSchema } from \"type-graphql\"\nconst schema = await buildSchema({ resolvers: [RecipeResolver] })",
    ],
    rejects: [
      "const buildSchema = (...parts) => parts\nconst schema = await buildSchema({ resolvers: [RecipeResolver] })",
    ],
  },
]
