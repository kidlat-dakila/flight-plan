import type { PatternFixture } from "@/catalogue/types"

const RTK_QUERY = "RTK Query"

const RTK_QUERY_API = "import { createApi, fetchBaseQuery } from \"@reduxjs/toolkit/query/react\"\nexport const api = createApi({ baseQuery: fetchBaseQuery({ baseUrl: \"/api\" }), endpoints: (build) => ({ getPosts: build.query({ query: () => \"posts\" }) }) })"

export const rtkQueryFixtures: readonly PatternFixture[] = [
  {
    library: RTK_QUERY,
    patternKey: "factory:createApi:*",
    matches: [RTK_QUERY_API],
    rejects: [
      "const createApi = (options) => options\nexport const api = createApi({ endpoints: (build) => ({ getPosts: build.query({ query: () => \"posts\" }) }) })",
    ],
  },
  {
    library: RTK_QUERY,
    patternKey: "factory:createApi:*>call:injectEndpoints:*",
    matches: [`${RTK_QUERY_API}\nexport const postsApi = api.injectEndpoints({ endpoints: (build) => ({ addPost: build.mutation({ query: (body) => ({ url: "posts", method: "POST", body }) }) }) })`],
    rejects: [
      "const api = makeLocalRegistry()\nexport const postsApi = api.injectEndpoints({ endpoints: (build) => ({ addPost: build.mutation({ query: (body) => ({ url: \"posts\", method: \"POST\", body }) }) }) })",
    ],
  },
]
