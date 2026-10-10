import type { PatternFixture } from "@/catalogue/types"

const APOLLO_CLIENT = "Apollo Client"

export const apolloClientFixtures: readonly PatternFixture[] = [
  {
    library: APOLLO_CLIENT,
    patternKey: "call:useQuery:*",
    matches: [
      "import { useQuery } from \"@apollo/client\"\nconst { loading, error, data } = useQuery(GET_DOGS, { variables: { breed } })",
    ],
    rejects: [
      "const useQuery = (...parts) => parts\nconst { loading, error, data } = useQuery(GET_DOGS, { variables: { breed } })",
    ],
  },
  {
    library: APOLLO_CLIENT,
    patternKey: "call:useMutation:*",
    matches: [
      "import { useMutation } from \"@apollo/client\"\nconst [addTodo, { data }] = useMutation(ADD_TODO, { refetchQueries: [GET_TODOS] })",
    ],
    rejects: [
      "const useMutation = (...parts) => parts\nconst [addTodo, { data }] = useMutation(ADD_TODO, { refetchQueries: [GET_TODOS] })",
    ],
  },
  {
    library: APOLLO_CLIENT,
    patternKey: "factory:ApolloClient:*",
    matches: [
      "import { ApolloClient } from \"@apollo/client\"\nconst client = new ApolloClient({ link: new HttpLink({ uri: \"/graphql\" }), cache: new InMemoryCache() })",
    ],
    rejects: [
      "const ApolloClient = (...parts) => parts\nconst client = new ApolloClient({ link: new HttpLink({ uri: \"/graphql\" }), cache: new InMemoryCache() })",
    ],
  },
]

const FATE = "fate"

export const fateFixtures: readonly PatternFixture[] = [
  {
    library: FATE,
    patternKey: "call:useRequest:*",
    matches: [
      "import { useRequest } from \"react-fate\"\nconst { posts } = useRequest({ posts: { list: PostView } })",
    ],
    rejects: [
      "const useRequest = (...parts) => parts\nconst { posts } = useRequest({ posts: { list: PostView } })",
    ],
  },
  {
    library: FATE,
    patternKey: "call:useView:*",
    matches: [
      "import { useView } from \"react-fate\"\nconst post = useView(PostView, postRef)",
    ],
    rejects: [
      "const useView = (...parts) => parts\nconst post = useView(PostView, postRef)",
    ],
  },
  {
    library: FATE,
    patternKey: "call:useListView:*",
    matches: [
      "import { useListView } from \"react-fate\"\nconst [comments, loadNext] = useListView(CommentConnectionView, post.comments)",
    ],
    rejects: [
      "const useListView = (...parts) => parts\nconst [comments, loadNext] = useListView(CommentConnectionView, post.comments)",
    ],
  },
  {
    library: FATE,
    patternKey: "factory:useFateClient:*",
    matches: [
      "import { useFateClient } from \"react-fate\"\nconst fate = useFateClient()",
    ],
    rejects: [
      "const useFateClient = (...parts) => parts\nconst fate = useFateClient()",
    ],
  },
  {
    library: FATE,
    patternKey: "factory:useFateClient:*>call:request:*",
    matches: [
      "import { useFateClient } from \"react-fate\"\nconst fate = useFateClient()\nawait fate.request({ posts: { list: PostView } })",
    ],
    rejects: [
      "const fate = makeLocalRegistry()\nawait fate.request({ posts: { list: PostView } })",
    ],
  },
]

const ORPC = "oRPC"

export const orpcFixtures: readonly PatternFixture[] = [
  {
    library: ORPC,
    patternKey: "call:os.use:*",
    matches: [
      "import { os } from \"@orpc/server\"\nconst authed = os.use(({ context, next }) => next({ context: { user: context.user } }))",
    ],
    rejects: [
      "const os = makeLocalRegistry()\nconst authed = os.use(({ context, next }) => next({ context: { user: context.user } }))",
    ],
  },
  {
    library: ORPC,
    patternKey: "factory:createORPCClient:*",
    matches: [
      "import { createORPCClient } from \"@orpc/client\"\nconst client = createORPCClient(link)",
    ],
    rejects: [
      "const createORPCClient = (...parts) => parts\nconst client = createORPCClient(link)",
    ],
  },
  {
    library: ORPC,
    patternKey: "factory:createTanstackQueryUtils:*",
    matches: [
      "import { createTanstackQueryUtils } from \"@orpc/tanstack-query\"\nconst orpc = createTanstackQueryUtils(client)",
    ],
    rejects: [
      "const createTanstackQueryUtils = (...parts) => parts\nconst orpc = createTanstackQueryUtils(client)",
    ],
  },
  {
    library: ORPC,
    patternKey: "factory:createTanstackQueryUtils:*>call:queryOptions:*",
    matches: [
      "import { createTanstackQueryUtils } from \"@orpc/tanstack-query\"\nconst orpc = createTanstackQueryUtils(client)\nconst query = useQuery(orpc.planet.list.queryOptions({ input: {} }))",
    ],
    rejects: [
      "const orpc = makeLocalRegistry()\nconst query = useQuery(orpc.planet.list.queryOptions({ input: {} }))",
    ],
  },
  {
    library: ORPC,
    patternKey: "factory:createTanstackQueryUtils:*>call:mutationOptions:*",
    matches: [
      "import { createTanstackQueryUtils } from \"@orpc/tanstack-query\"\nconst orpc = createTanstackQueryUtils(client)\nconst mutation = useMutation(orpc.planet.create.mutationOptions())",
    ],
    rejects: [
      "const orpc = makeLocalRegistry()\nconst mutation = useMutation(orpc.planet.create.mutationOptions())",
    ],
  },
]

const PINIA_COLADA = "Pinia Colada"

export const piniaColadaFixtures: readonly PatternFixture[] = [
  {
    library: PINIA_COLADA,
    patternKey: "call:useQuery:*",
    matches: [
      "import { useQuery } from \"@pinia/colada\"\nconst { data: contact } = useQuery({ key: () => [\"contacts\", id.value], query: () => getContactById(id.value) })",
    ],
    rejects: [
      "const useQuery = (...parts) => parts\nconst { data: contact } = useQuery({ key: () => [\"contacts\", id.value], query: () => getContactById(id.value) })",
    ],
  },
  {
    library: PINIA_COLADA,
    patternKey: "call:useMutation:*",
    matches: [
      "import { useMutation } from \"@pinia/colada\"\nconst { mutate } = useMutation({ mutation: patchContact, onSettled: refresh })",
    ],
    rejects: [
      "const useMutation = (...parts) => parts\nconst { mutate } = useMutation({ mutation: patchContact, onSettled: refresh })",
    ],
  },
  {
    library: PINIA_COLADA,
    patternKey: "call:defineQueryOptions:*",
    matches: [
      "import { defineQueryOptions } from \"@pinia/colada\"\nconst contactQuery = defineQueryOptions((id) => ({ key: [\"contacts\", id], query: () => getContactById(id) }))",
    ],
    rejects: [
      "const defineQueryOptions = (...parts) => parts\nconst contactQuery = defineQueryOptions((id) => ({ key: [\"contacts\", id], query: () => getContactById(id) }))",
    ],
  },
  {
    library: PINIA_COLADA,
    patternKey: "factory:useQueryCache:*",
    matches: [
      "import { useQueryCache } from \"@pinia/colada\"\nconst queryCache = useQueryCache()",
    ],
    rejects: [
      "const useQueryCache = (...parts) => parts\nconst queryCache = useQueryCache()",
    ],
  },
  {
    library: PINIA_COLADA,
    patternKey: "factory:useQueryCache:*>call:invalidateQueries:*",
    matches: [
      "import { useQueryCache } from \"@pinia/colada\"\nconst queryCache = useQueryCache()\nqueryCache.invalidateQueries({ key: [\"contacts\"] })",
    ],
    rejects: [
      "const queryCache = makeLocalRegistry()\nqueryCache.invalidateQueries({ key: [\"contacts\"] })",
    ],
  },
]

const RELAY = "Relay"

export const relayFixtures: readonly PatternFixture[] = [
  {
    library: RELAY,
    patternKey: "call:useLazyLoadQuery:*",
    matches: [
      "import { useLazyLoadQuery } from \"react-relay\"\nconst data = useLazyLoadQuery(NewsfeedQuery, {})",
    ],
    rejects: [
      "const useLazyLoadQuery = (...parts) => parts\nconst data = useLazyLoadQuery(NewsfeedQuery, {})",
    ],
  },
  {
    library: RELAY,
    patternKey: "call:usePreloadedQuery:*",
    matches: [
      "import { usePreloadedQuery } from \"react-relay\"\nconst data = usePreloadedQuery(query, queryRef)",
    ],
    rejects: [
      "const usePreloadedQuery = (...parts) => parts\nconst data = usePreloadedQuery(query, queryRef)",
    ],
  },
  {
    library: RELAY,
    patternKey: "call:useQueryLoader:*",
    matches: [
      "import { useQueryLoader } from \"react-relay\"\nconst [queryRef, loadQuery] = useQueryLoader(query)",
    ],
    rejects: [
      "const useQueryLoader = (...parts) => parts\nconst [queryRef, loadQuery] = useQueryLoader(query)",
    ],
  },
  {
    library: RELAY,
    patternKey: "call:useFragment:*",
    matches: [
      "import { useFragment } from \"react-relay\"\nconst data = useFragment(StoryFragment, story)",
    ],
    rejects: [
      "const useFragment = (...parts) => parts\nconst data = useFragment(StoryFragment, story)",
    ],
  },
  {
    library: RELAY,
    patternKey: "call:useMutation:*",
    matches: [
      "import { useMutation } from \"react-relay\"\nconst [commitMutation, isMutationInFlight] = useMutation(StoryLikeButtonLikeMutation)",
    ],
    rejects: [
      "const useMutation = (...parts) => parts\nconst [commitMutation, isMutationInFlight] = useMutation(StoryLikeButtonLikeMutation)",
    ],
  },
]

const REMULT = "Remult"

export const remultFixtures: readonly PatternFixture[] = [
  {
    library: REMULT,
    patternKey: "factory:repo:*",
    matches: [
      "import { repo } from \"remult\"\nconst taskRepo = repo(Task)",
    ],
    rejects: [
      "const repo = (...parts) => parts\nconst taskRepo = repo(Task)",
    ],
  },
  {
    library: REMULT,
    patternKey: "factory:repo:*>call:find:*",
    matches: [
      "import { repo } from \"remult\"\nconst taskRepo = repo(Task)\ntaskRepo.find({ id: 1 })",
    ],
    rejects: [
      "const taskRepo = makeLocalRegistry()\ntaskRepo.find({ id: 1 })",
    ],
  },
  {
    library: REMULT,
    patternKey: "factory:repo:*>call:insert:*",
    matches: [
      "import { repo } from \"remult\"\nconst taskRepo = repo(Task)\ntaskRepo.insert({ id: 1 })",
    ],
    rejects: [
      "const taskRepo = makeLocalRegistry()\ntaskRepo.insert({ id: 1 })",
    ],
  },
  {
    library: REMULT,
    patternKey: "factory:repo:*>call:save:*",
    matches: [
      "import { repo } from \"remult\"\nconst taskRepo = repo(Task)\ntaskRepo.save({ id: 1 })",
    ],
    rejects: [
      "const taskRepo = makeLocalRegistry()\ntaskRepo.save({ id: 1 })",
    ],
  },
  {
    library: REMULT,
    patternKey: "factory:repo:*>call:delete:*",
    matches: [
      "import { repo } from \"remult\"\nconst taskRepo = repo(Task)\ntaskRepo.delete({ id: 1 })",
    ],
    rejects: [
      "const taskRepo = makeLocalRegistry()\ntaskRepo.delete({ id: 1 })",
    ],
  },
  {
    library: REMULT,
    patternKey: "factory:repo:*>call:liveQuery:*",
    matches: [
      "import { repo } from \"remult\"\nconst taskRepo = repo(Task)\ntaskRepo.liveQuery({ id: 1 })",
    ],
    rejects: [
      "const taskRepo = makeLocalRegistry()\ntaskRepo.liveQuery({ id: 1 })",
    ],
  },
  {
    library: REMULT,
    patternKey: "decorator:Entity:*",
    matches: [
      "import { Entity } from \"remult\"\n@Entity(\"tasks\", { allowApiCrud: true })\nexport class Task {}",
    ],
    rejects: [
      "const Entity = (...parts) => parts\n@Entity(\"tasks\", { allowApiCrud: true })\nexport class Task {}",
    ],
  },
]

const SWR = "SWR"

export const swrFixtures: readonly PatternFixture[] = [
  {
    library: SWR,
    patternKey: "call:default@swr:*",
    matches: [
      "import useSWR from \"swr\"\nconst { data, error } = useSWR(\"/api/user\", fetcher)",
    ],
    rejects: [
      "const useSWR = (...parts) => parts\nconst { data, error } = useSWR(\"/api/user\", fetcher)",
    ],
  },
  {
    library: SWR,
    patternKey: "call:default@swr/mutation:*",
    matches: [
      "import useSWRMutation from \"swr/mutation\"\nconst { trigger } = useSWRMutation(\"/api/user\", sendRequest)",
    ],
    rejects: [
      "const useSWRMutation = (...parts) => parts\nconst { trigger } = useSWRMutation(\"/api/user\", sendRequest)",
    ],
  },
  {
    library: SWR,
    patternKey: "call:default@swr/infinite:*",
    matches: [
      "import useSWRInfinite from \"swr/infinite\"\nconst { data, size, setSize } = useSWRInfinite(getKey, fetcher)",
    ],
    rejects: [
      "const useSWRInfinite = (...parts) => parts\nconst { data, size, setSize } = useSWRInfinite(getKey, fetcher)",
    ],
  },
  {
    library: SWR,
    patternKey: "call:preload:*",
    matches: [
      "import { preload } from \"swr\"\npreload(\"/api/user\", fetcher)",
    ],
    rejects: [
      "const preload = (...parts) => parts\npreload(\"/api/user\", fetcher)",
    ],
  },
  {
    library: SWR,
    patternKey: "call:mutate:*",
    matches: [
      "import { mutate } from \"swr\"\nmutate(\"/api/user\")",
    ],
    rejects: [
      "const mutate = (...parts) => parts\nmutate(\"/api/user\")",
    ],
  },
]

const TANSTACK_QUERY = "TanStack Query"

const TANSTACK_QUERY_EVERY_VERSION = "*"

const TANSTACK_QUERY_BEFORE_SINGLE_OBJECT = "<5"

const TANSTACK_QUERY_SINCE_SINGLE_OBJECT = ">=5"

const TANSTACK_QUERY_CLIENT_KEY = "factory:useQueryClient:*"

const tanstackQueryImporting = (specifier: string, name: string, code: string): string => `import { ${name} } from "${specifier}"\n${code}`

const tanstackQueryDeclaringLocally = (name: string, code: string): string => `const ${name} = (...parts) => parts\n${code}`

const tanstackQueryCallFixture = (name: string, versions: string, call: string, otherVersionCalls: readonly string[] = []): PatternFixture => ({
  library: TANSTACK_QUERY,
  patternKey: `call:${name}:${versions}`,
  matches: [tanstackQueryImporting("@tanstack/react-query", name, call), tanstackQueryImporting("@tanstack/vue-query", name, call)],
  rejects: [
    tanstackQueryDeclaringLocally(name, call),
    ...otherVersionCalls.map((otherCall) => tanstackQueryImporting("@tanstack/react-query", name, otherCall)),
  ],
})

const tanstackQueryWithClient = (code: string): string => tanstackQueryImporting("@tanstack/react-query", "useQueryClient", `const queryClient = useQueryClient()\n${code}`)

const tanstackQueryCacheMethodFixture = (name: string, call: string): PatternFixture => ({
  library: TANSTACK_QUERY,
  patternKey: `${TANSTACK_QUERY_CLIENT_KEY}>call:${name}:*`,
  matches: [tanstackQueryWithClient(call)],
  rejects: [`const queryClient = makeLocalCache()\n${call}`],
})

const TANSTACK_QUERY_POSITIONAL_QUERY = "useQuery([\"orders\"], fetchOrders)"

const TANSTACK_QUERY_POSITIONAL_INFINITE_QUERY = "useInfiniteQuery([\"projects\"], fetchProjects, { getNextPageParam: nextCursorOf })"

const TANSTACK_QUERY_POSITIONAL_MUTATION = "useMutation(addTodo, { onSuccess: showSaved })"

export const tanstackQueryFixtures: readonly PatternFixture[] = [
  tanstackQueryCallFixture("useQuery", TANSTACK_QUERY_BEFORE_SINGLE_OBJECT, TANSTACK_QUERY_POSITIONAL_QUERY),
  tanstackQueryCallFixture(
    "useQuery",
    TANSTACK_QUERY_SINCE_SINGLE_OBJECT,
    "useQuery({ queryKey: [\"orders\"], queryFn: fetchOrders, select: openOrdersOf })",
    [TANSTACK_QUERY_POSITIONAL_QUERY],
  ),
  tanstackQueryCallFixture("useInfiniteQuery", TANSTACK_QUERY_BEFORE_SINGLE_OBJECT, TANSTACK_QUERY_POSITIONAL_INFINITE_QUERY),
  tanstackQueryCallFixture(
    "useInfiniteQuery",
    TANSTACK_QUERY_SINCE_SINGLE_OBJECT,
    "useInfiniteQuery({ queryKey: [\"projects\"], queryFn: fetchProjects, initialPageParam: 0, getNextPageParam: nextCursorOf })",
    [TANSTACK_QUERY_POSITIONAL_INFINITE_QUERY],
  ),
  tanstackQueryCallFixture("useMutation", TANSTACK_QUERY_BEFORE_SINGLE_OBJECT, TANSTACK_QUERY_POSITIONAL_MUTATION),
  tanstackQueryCallFixture("useMutation", TANSTACK_QUERY_SINCE_SINGLE_OBJECT, "useMutation({ mutationFn: addTodo, onSuccess: showSaved })", [TANSTACK_QUERY_POSITIONAL_MUTATION]),
  tanstackQueryCallFixture("useSuspenseQuery", TANSTACK_QUERY_EVERY_VERSION, "useSuspenseQuery({ queryKey: [\"orders\"], queryFn: fetchOrders })"),
  tanstackQueryCallFixture(
    "useSuspenseInfiniteQuery",
    TANSTACK_QUERY_EVERY_VERSION,
    "useSuspenseInfiniteQuery({ queryKey: [\"projects\"], queryFn: fetchProjects, initialPageParam: 0, getNextPageParam: nextCursorOf })",
  ),
  tanstackQueryCallFixture("queryOptions", TANSTACK_QUERY_EVERY_VERSION, "const ordersOptions = queryOptions({ queryKey: [\"orders\"], queryFn: fetchOrders })"),
  tanstackQueryCallFixture(
    "infiniteQueryOptions",
    TANSTACK_QUERY_EVERY_VERSION,
    "const projectsOptions = infiniteQueryOptions({ queryKey: [\"projects\"], queryFn: fetchProjects, initialPageParam: 0, getNextPageParam: nextCursorOf })",
  ),
  tanstackQueryCallFixture(
    "useQueries",
    TANSTACK_QUERY_EVERY_VERSION,
    "useQueries({ queries: postIds.map((id) => ({ queryKey: [\"post\", id], queryFn: () => fetchPost(id) })), combine: titlesOf })",
  ),
  tanstackQueryCallFixture(
    "useSuspenseQueries",
    TANSTACK_QUERY_EVERY_VERSION,
    "useSuspenseQueries({ queries: [{ queryKey: [\"posts\"], queryFn: fetchPosts }, { queryKey: [\"users\"], queryFn: fetchUsers }] })",
  ),
  tanstackQueryCallFixture("mutationOptions", TANSTACK_QUERY_EVERY_VERSION, "const addGroupOptions = mutationOptions({ mutationKey: [\"addGroup\"], mutationFn: addGroup })"),
  {
    library: TANSTACK_QUERY,
    patternKey: TANSTACK_QUERY_CLIENT_KEY,
    matches: [tanstackQueryWithClient("")],
    rejects: [tanstackQueryDeclaringLocally("useQueryClient", "const queryClient = useQueryClient()")],
  },
  tanstackQueryCacheMethodFixture("invalidateQueries", "queryClient.invalidateQueries({ queryKey: [\"todos\"] })"),
  tanstackQueryCacheMethodFixture("refetchQueries", "queryClient.refetchQueries({ queryKey: [\"posts\"], type: \"active\" })"),
  tanstackQueryCacheMethodFixture("removeQueries", "queryClient.removeQueries({ queryKey: [\"posts\"] })"),
  tanstackQueryCacheMethodFixture("resetQueries", "queryClient.resetQueries({ queryKey: [\"posts\"] })"),
  tanstackQueryCacheMethodFixture("cancelQueries", "queryClient.cancelQueries({ queryKey: [\"posts\"], exact: true })"),
  tanstackQueryCacheMethodFixture("setQueriesData", "queryClient.setQueriesData({ queryKey: [\"posts\"] }, withoutDrafts)"),
  tanstackQueryCacheMethodFixture("getQueryData", "queryClient.getQueryData([\"posts\"])"),
  tanstackQueryCacheMethodFixture("setQueryData", "queryClient.setQueryData([\"posts\"], (oldPosts) => [...oldPosts, newPost])"),
  tanstackQueryCacheMethodFixture("fetchQuery", "queryClient.fetchQuery({ queryKey: [\"posts\"], queryFn: fetchPosts })"),
  tanstackQueryCacheMethodFixture("prefetchQuery", "queryClient.prefetchQuery({ queryKey: [\"posts\"], queryFn: fetchPosts })"),
  tanstackQueryCacheMethodFixture("ensureQueryData", "queryClient.ensureQueryData({ queryKey: [\"posts\"], queryFn: fetchPosts })"),
  tanstackQueryCacheMethodFixture("fetchInfiniteQuery", "queryClient.fetchInfiniteQuery({ queryKey: [\"projects\"], queryFn: fetchProjects, initialPageParam: 0 })"),
  tanstackQueryCacheMethodFixture("prefetchInfiniteQuery", "queryClient.prefetchInfiniteQuery({ queryKey: [\"projects\"], queryFn: fetchProjects, initialPageParam: 0 })"),
]

const URQL = "URQL"

export const urqlFixtures: readonly PatternFixture[] = [
  {
    library: URQL,
    patternKey: "call:useQuery:*",
    matches: [
      "import { useQuery } from \"urql\"\nconst [result, reexecuteQuery] = useQuery({ query: TodosQuery })",
    ],
    rejects: [
      "const useQuery = (...parts) => parts\nconst [result, reexecuteQuery] = useQuery({ query: TodosQuery })",
    ],
  },
  {
    library: URQL,
    patternKey: "call:useMutation:*",
    matches: [
      "import { useMutation } from \"urql\"\nconst [updateTodoResult, updateTodo] = useMutation(UpdateTodo)",
    ],
    rejects: [
      "const useMutation = (...parts) => parts\nconst [updateTodoResult, updateTodo] = useMutation(UpdateTodo)",
    ],
  },
]
