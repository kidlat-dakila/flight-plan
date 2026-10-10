import type { CallPattern, CatalogueLibrary, Slot } from "@/catalogue/types"

const FIRST_ARGUMENT = 0

const SECOND_ARGUMENT = 1

export const apolloClientLibrary: CatalogueLibrary = {
  name: "Apollo Client",
  specifiers: ["@apollo/client", "@apollo/client/react"],
  documentedVersion: "4.3",
  category: "data-fetching",
  type: "frontend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "useQuery", slots: [], makes: "data-fetch" },
    { kind: "call", name: "useMutation", slots: [], makes: "request" },
    {
      kind: "factory",
      name: "ApolloClient",
      makes: "request",
      methods: [],
    },
  ],
}

export const fateLibrary: CatalogueLibrary = {
  name: "fate",
  specifiers: ["react-fate"],
  documentedVersion: "1.7",
  category: "data-fetching",
  type: "frontend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "useRequest", slots: [], makes: "data-fetch" },
    { kind: "call", name: "useView", slots: [], makes: "cache" },
    { kind: "call", name: "useListView", slots: [], makes: "cache" },
    {
      kind: "factory",
      name: "useFateClient",
      methods: [
        { kind: "call", name: "request", slots: [], makes: "request" },
      ],
    },
  ],
}

export const orpcLibrary: CatalogueLibrary = {
  name: "oRPC",
  specifiers: ["@orpc/server", "@orpc/client", "@orpc/client/fetch", "@orpc/tanstack-query"],
  documentedVersion: "1.15",
  category: "data-fetching",
  type: "fullstack",
  language: "javascript",
  patterns: [
    { kind: "call", name: "os.use", slots: [{ at: 0, runs: "middleware" }] },
    {
      kind: "factory",
      name: "createORPCClient",
      makes: "request",
      methods: [],
    },
    {
      kind: "factory",
      name: "createTanstackQueryUtils",
      methods: [
        { kind: "call", name: "queryOptions", slots: [], makes: "data-fetch" },
        { kind: "call", name: "mutationOptions", slots: [], makes: "request" },
      ],
    },
  ],
}

export const piniaColadaLibrary: CatalogueLibrary = {
  name: "Pinia Colada",
  specifiers: ["@pinia/colada"],
  documentedVersion: "1.4",
  category: "data-fetching",
  type: "frontend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "useQuery", slots: [{ at: "query", runs: "effect" }], makes: "data-fetch" },
    { kind: "call", name: "useMutation", slots: [{ at: "mutation", runs: "kept" }], makes: "request" },
    { kind: "call", name: "defineQueryOptions", slots: [{ at: 0, runs: "in-place" }] },
    {
      kind: "factory",
      name: "useQueryCache",
      methods: [
        { kind: "call", name: "invalidateQueries", slots: [], makes: "cache" },
      ],
    },
  ],
}

export const relayLibrary: CatalogueLibrary = {
  name: "Relay",
  specifiers: ["react-relay"],
  documentedVersion: "21.0",
  category: "data-fetching",
  type: "frontend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "useLazyLoadQuery", slots: [], makes: "data-fetch" },
    { kind: "call", name: "usePreloadedQuery", slots: [], makes: "data-fetch" },
    { kind: "call", name: "useQueryLoader", slots: [], makes: "request" },
    { kind: "call", name: "useFragment", slots: [], makes: "cache" },
    { kind: "call", name: "useMutation", slots: [], makes: "request" },
  ],
}

export const remultLibrary: CatalogueLibrary = {
  name: "Remult",
  specifiers: ["remult"],
  documentedVersion: "3.3",
  category: "data-fetching",
  type: "fullstack",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "repo",
      methods: [
        { kind: "call", name: "find", slots: [], makes: "data-fetch" },
        { kind: "call", name: "insert", slots: [], makes: "data" },
        { kind: "call", name: "save", slots: [], makes: "data" },
        { kind: "call", name: "delete", slots: [], makes: "data" },
        { kind: "call", name: "liveQuery", slots: [], makes: "data-fetch" },
      ],
    },
    { kind: "decorator", name: "Entity", makes: "data" },
  ],
}

export const swrLibrary: CatalogueLibrary = {
  name: "SWR",
  specifiers: ["swr", "swr/mutation", "swr/infinite"],
  documentedVersion: "2.5",
  category: "data-fetching",
  type: "frontend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "default", slots: [{ at: 1, runs: "effect" }], from: "swr", makes: "data-fetch" },
    { kind: "call", name: "default", slots: [{ at: 1, runs: "kept" }], from: "swr/mutation", makes: "request" },
    { kind: "call", name: "default", slots: [{ at: 0, runs: "in-place" }, { at: 1, runs: "effect" }], from: "swr/infinite", makes: "data-fetch" },
    { kind: "call", name: "preload", slots: [{ at: 1, runs: "in-place" }], makes: "cache" },
    { kind: "call", name: "mutate", slots: [], makes: "cache" },
  ],
}

const TANSTACK_QUERY_BEFORE_SINGLE_OBJECT = "<5"

const TANSTACK_QUERY_SINCE_SINGLE_OBJECT = ">=5"

const TANSTACK_QUERY_EACH_QUERY_SLOTS: readonly Slot[] = [
  { at: "queries[].queryFn", runs: "effect" },
  { at: "queries[].select", runs: "in-place" },
  { at: "combine", runs: "in-place" },
]

const TANSTACK_QUERY_CACHE_METHODS: readonly CallPattern[] = [
  { kind: "call", name: "invalidateQueries", slots: [], makes: "cache" },
  { kind: "call", name: "refetchQueries", slots: [], makes: "cache" },
  { kind: "call", name: "removeQueries", slots: [], makes: "cache" },
  { kind: "call", name: "resetQueries", slots: [], makes: "cache" },
  { kind: "call", name: "cancelQueries", slots: [], makes: "cache" },
  { kind: "call", name: "setQueriesData", slots: [], makes: "cache" },
  { kind: "call", name: "getQueryData", slots: [], makes: "cache" },
  { kind: "call", name: "setQueryData", slots: [{ at: SECOND_ARGUMENT, runs: "in-place" }], makes: "cache" },
  { kind: "call", name: "fetchQuery", slots: [{ at: "queryFn", runs: "in-place" }], makes: "cache" },
  { kind: "call", name: "prefetchQuery", slots: [{ at: "queryFn", runs: "in-place" }], makes: "cache" },
  { kind: "call", name: "ensureQueryData", slots: [{ at: "queryFn", runs: "in-place" }], makes: "cache" },
  { kind: "call", name: "fetchInfiniteQuery", slots: [{ at: "queryFn", runs: "in-place" }], makes: "cache" },
  { kind: "call", name: "prefetchInfiniteQuery", slots: [{ at: "queryFn", runs: "in-place" }], makes: "cache" },
]

export const tanstackQueryLibrary: CatalogueLibrary = {
  name: "TanStack Query",
  specifiers: ["@tanstack/react-query", "@tanstack/vue-query"],
  documentedVersion: "5.104 and 4.29",
  category: "data-fetching",
  type: "frontend",
  language: "javascript",
  patterns: [
    {
      kind: "call",
      name: "useQuery",
      versions: TANSTACK_QUERY_BEFORE_SINGLE_OBJECT,
      slots: [
        { at: SECOND_ARGUMENT, runs: "effect" },
        { at: "queryFn", runs: "effect" },
        { at: "select", runs: "in-place" },
      ],
    },
    {
      kind: "call",
      name: "useQuery",
      versions: TANSTACK_QUERY_SINCE_SINGLE_OBJECT,
      slots: [
        { at: "queryFn", runs: "effect" },
        { at: "select", runs: "in-place" },
      ],
    },
    {
      kind: "call",
      name: "useInfiniteQuery",
      versions: TANSTACK_QUERY_BEFORE_SINGLE_OBJECT,
      slots: [
        { at: SECOND_ARGUMENT, runs: "effect" },
        { at: "queryFn", runs: "effect" },
        { at: "select", runs: "in-place" },
      ],
    },
    {
      kind: "call",
      name: "useInfiniteQuery",
      versions: TANSTACK_QUERY_SINCE_SINGLE_OBJECT,
      slots: [
        { at: "queryFn", runs: "effect" },
        { at: "select", runs: "in-place" },
      ],
    },
    {
      kind: "call",
      name: "useMutation",
      versions: TANSTACK_QUERY_BEFORE_SINGLE_OBJECT,
      slots: [
        { at: FIRST_ARGUMENT, runs: "kept" },
        { at: "mutationFn", runs: "kept" },
      ],
    },
    { kind: "call", name: "useMutation", versions: TANSTACK_QUERY_SINCE_SINGLE_OBJECT, slots: [{ at: "mutationFn", runs: "kept" }] },
    {
      kind: "call",
      name: "useSuspenseQuery",
      slots: [
        { at: "queryFn", runs: "effect" },
        { at: "select", runs: "in-place" },
      ],
    },
    {
      kind: "call",
      name: "useSuspenseInfiniteQuery",
      slots: [
        { at: "queryFn", runs: "effect" },
        { at: "select", runs: "in-place" },
      ],
    },
    {
      kind: "call",
      name: "queryOptions",
      slots: [
        { at: "queryFn", runs: "effect" },
        { at: "select", runs: "in-place" },
      ],
    },
    {
      kind: "call",
      name: "infiniteQueryOptions",
      slots: [
        { at: "queryFn", runs: "effect" },
        { at: "select", runs: "in-place" },
      ],
    },
    { kind: "call", name: "useQueries", slots: TANSTACK_QUERY_EACH_QUERY_SLOTS },
    { kind: "call", name: "useSuspenseQueries", slots: TANSTACK_QUERY_EACH_QUERY_SLOTS },
    { kind: "call", name: "mutationOptions", slots: [{ at: "mutationFn", runs: "kept" }] },
    { kind: "factory", name: "useQueryClient", methods: TANSTACK_QUERY_CACHE_METHODS },
  ],
}

export const urqlLibrary: CatalogueLibrary = {
  name: "URQL",
  specifiers: ["urql", "@urql/core", "@urql/vue"],
  documentedVersion: "5.0",
  category: "data-fetching",
  type: "frontend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "useQuery", slots: [], makes: "data-fetch" },
    { kind: "call", name: "useMutation", slots: [], makes: "request" },
  ],
}
