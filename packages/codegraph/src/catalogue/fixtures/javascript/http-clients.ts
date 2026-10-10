import type { PatternFixture } from "@/catalogue/types"

const ALOVA = "Alova"

export const alovaFixtures: readonly PatternFixture[] = [
  {
    library: ALOVA,
    patternKey: "factory:createAlova:*",
    matches: [
      "import { createAlova } from \"alova\"\nconst alovaInstance = createAlova({ baseURL: \"https://api.example.com\", requestAdapter: adapterFetch() })",
    ],
    rejects: [
      "const createAlova = (...parts) => parts\nconst alovaInstance = createAlova({ baseURL: \"https://api.example.com\", requestAdapter: adapterFetch() })",
    ],
  },
  {
    library: ALOVA,
    patternKey: "factory:createAlova:*>call:Get:*",
    matches: [
      "import { createAlova } from \"alova\"\nconst alovaInstance = createAlova({ baseURL: \"https://api.example.com\", requestAdapter: adapterFetch() })\nconst todos = await alovaInstance.Get(\"/todos\")",
    ],
    rejects: [
      "const alovaInstance = makeLocalRegistry()\nconst todos = await alovaInstance.Get(\"/todos\")",
    ],
  },
  {
    library: ALOVA,
    patternKey: "factory:createAlova:*>call:Post:*",
    matches: [
      "import { createAlova } from \"alova\"\nconst alovaInstance = createAlova({ baseURL: \"https://api.example.com\", requestAdapter: adapterFetch() })\nconst todo = await alovaInstance.Post(\"/todos\", { title: \"Buy milk\" })",
    ],
    rejects: [
      "const alovaInstance = makeLocalRegistry()\nconst todo = await alovaInstance.Post(\"/todos\", { title: \"Buy milk\" })",
    ],
  },
  {
    library: ALOVA,
    patternKey: "call:useRequest:*",
    matches: [
      "import { useRequest } from \"alova/client\"\nconst { loading, data, error } = useRequest(alovaInstance.Get(\"/todos\"))",
    ],
    rejects: [
      "const useRequest = (...parts) => parts\nconst { loading, data, error } = useRequest(alovaInstance.Get(\"/todos\"))",
    ],
  },
]

const AXIOS = "Axios"

export const axiosFixtures: readonly PatternFixture[] = [
  {
    library: AXIOS,
    patternKey: "call:default:*",
    matches: [
      "import axios from \"axios\"\nconst response = await axios({ method: \"post\", url: \"/user/12345\", data })",
    ],
    rejects: [
      "const axios = (...parts) => parts\nconst response = await axios({ method: \"post\", url: \"/user/12345\", data })",
    ],
  },
  {
    library: AXIOS,
    patternKey: "call:default.get:*",
    matches: [
      "import axios from \"axios\"\nconst response = await axios.get(\"/user?ID=12345\")",
    ],
    rejects: [
      "const axios = makeLocalRegistry()\nconst response = await axios.get(\"/user?ID=12345\")",
    ],
  },
  {
    library: AXIOS,
    patternKey: "call:default.post:*",
    matches: [
      "import axios from \"axios\"\nconst response = await axios.post(\"/user?ID=12345\")",
    ],
    rejects: [
      "const axios = makeLocalRegistry()\nconst response = await axios.post(\"/user?ID=12345\")",
    ],
  },
  {
    library: AXIOS,
    patternKey: "factory:default.create:*",
    matches: [
      "import axios from \"axios\"\nconst instance = axios.create({ baseURL: \"https://api.example.com\" })",
    ],
    rejects: [
      "const axios = makeLocalRegistry()\nconst instance = axios.create({ baseURL: \"https://api.example.com\" })",
    ],
  },
  {
    library: AXIOS,
    patternKey: "factory:default.create:*>call:get:*",
    matches: [
      "import axios from \"axios\"\nconst instance = axios.create({ baseURL: \"https://api.example.com\" })\nconst response = await instance.get(\"/users\")",
    ],
    rejects: [
      "const instance = makeLocalRegistry()\nconst response = await instance.get(\"/users\")",
    ],
  },
  {
    library: AXIOS,
    patternKey: "factory:default.create:*>call:post:*",
    matches: [
      "import axios from \"axios\"\nconst instance = axios.create({ baseURL: \"https://api.example.com\" })\nconst response = await instance.post(\"/users\")",
    ],
    rejects: [
      "const instance = makeLocalRegistry()\nconst response = await instance.post(\"/users\")",
    ],
  },
  {
    library: AXIOS,
    patternKey: "factory:default.create:*>call:use:*",
    matches: [
      "import axios from \"axios\"\nconst instance = axios.create({ baseURL: \"https://api.example.com\" })\ninstance.interceptors.request.use((config) => withToken(config))",
    ],
    rejects: [
      "const instance = makeLocalRegistry()\ninstance.interceptors.request.use((config) => withToken(config))",
    ],
  },
]

const BETTERFETCH = "BetterFetch"

export const betterfetchFixtures: readonly PatternFixture[] = [
  {
    library: BETTERFETCH,
    patternKey: "call:betterFetch:*",
    matches: [
      "import { betterFetch } from \"@better-fetch/fetch\"\nconst { data, error } = await betterFetch(\"https://jsonplaceholder.typicode.com/todos/1\")",
    ],
    rejects: [
      "const betterFetch = (...parts) => parts\nconst { data, error } = await betterFetch(\"https://jsonplaceholder.typicode.com/todos/1\")",
    ],
  },
  {
    library: BETTERFETCH,
    patternKey: "factory:createFetch:*",
    matches: [
      "import { createFetch } from \"@better-fetch/fetch\"\nconst $fetch = createFetch({ baseURL: \"https://jsonplaceholder.typicode.com\" })",
    ],
    rejects: [
      "const createFetch = (...parts) => parts\nconst $fetch = createFetch({ baseURL: \"https://jsonplaceholder.typicode.com\" })",
    ],
  },
  {
    library: BETTERFETCH,
    patternKey: "factory:createFetch:*>called",
    matches: [
      "import { createFetch } from \"@better-fetch/fetch\"\nconst $fetch = createFetch({ baseURL: \"https://jsonplaceholder.typicode.com\" })\nconst { data } = await $fetch(\"/todos/:id\", { params: { id: 1 } })",
    ],
    rejects: [
      "const $fetch = makeLocalRegistry()\nconst { data } = await $fetch(\"/todos/:id\", { params: { id: 1 } })",
    ],
  },
]

const GOT = "Got"

export const gotFixtures: readonly PatternFixture[] = [
  {
    library: GOT,
    patternKey: "call:default:*",
    matches: [
      "import got from \"got\"\nconst data = await got(\"https://httpbin.org/anything\").json()",
    ],
    rejects: [
      "const got = (...parts) => parts\nconst data = await got(\"https://httpbin.org/anything\").json()",
    ],
  },
  {
    library: GOT,
    patternKey: "call:default.stream:*",
    matches: [
      "import got from \"got\"\nconst stream = got.stream(\"https://httpbin.org/anything\")",
    ],
    rejects: [
      "const got = makeLocalRegistry()\nconst stream = got.stream(\"https://httpbin.org/anything\")",
    ],
  },
  {
    library: GOT,
    patternKey: "factory:default.extend:*",
    matches: [
      "import got from \"got\"\nconst client = got.extend({ prefixUrl: \"https://httpbin.org\" })",
    ],
    rejects: [
      "const got = makeLocalRegistry()\nconst client = got.extend({ prefixUrl: \"https://httpbin.org\" })",
    ],
  },
  {
    library: GOT,
    patternKey: "factory:default.extend:*>call:get:*",
    matches: [
      "import got from \"got\"\nconst client = got.extend({ prefixUrl: \"https://httpbin.org\" })\nconst response = await client.get(\"anything\")",
    ],
    rejects: [
      "const client = makeLocalRegistry()\nconst response = await client.get(\"anything\")",
    ],
  },
]

const KY = "Ky"

export const kyFixtures: readonly PatternFixture[] = [
  {
    library: KY,
    patternKey: "call:default.get:*",
    matches: [
      "import ky from \"ky\"\nconst user = await ky.get(\"https://example.com/users\").json()",
    ],
    rejects: [
      "const ky = makeLocalRegistry()\nconst user = await ky.get(\"https://example.com/users\").json()",
    ],
  },
  {
    library: KY,
    patternKey: "call:default.post:*",
    matches: [
      "import ky from \"ky\"\nconst user = await ky.post(\"https://example.com/users\").json()",
    ],
    rejects: [
      "const ky = makeLocalRegistry()\nconst user = await ky.post(\"https://example.com/users\").json()",
    ],
  },
  {
    library: KY,
    patternKey: "factory:default.create:*",
    matches: [
      "import ky from \"ky\"\nconst api = ky.create({ prefixUrl: \"https://example.com/api\" })",
    ],
    rejects: [
      "const ky = makeLocalRegistry()\nconst api = ky.create({ prefixUrl: \"https://example.com/api\" })",
    ],
  },
  {
    library: KY,
    patternKey: "factory:default.create:*>call:get:*",
    matches: [
      "import ky from \"ky\"\nconst api = ky.create({ prefixUrl: \"https://example.com/api\" })\nconst response = await api.get(\"users/1\")",
    ],
    rejects: [
      "const api = makeLocalRegistry()\nconst response = await api.get(\"users/1\")",
    ],
  },
  {
    library: KY,
    patternKey: "factory:default.extend:*",
    matches: [
      "import ky from \"ky\"\nconst api = ky.extend({ hooks })",
    ],
    rejects: [
      "const ky = makeLocalRegistry()\nconst api = ky.extend({ hooks })",
    ],
  },
  {
    library: KY,
    patternKey: "factory:default.extend:*>call:get:*",
    matches: [
      "import ky from \"ky\"\nconst api = ky.extend({ hooks })\nconst response = await api.get(\"users/1\")",
    ],
    rejects: [
      "const api = makeLocalRegistry()\nconst response = await api.get(\"users/1\")",
    ],
  },
]

const OFETCH = "ofetch"

export const ofetchFixtures: readonly PatternFixture[] = [
  {
    library: OFETCH,
    patternKey: "call:ofetch:*",
    matches: [
      "import { ofetch } from \"ofetch\"\nconst users = await ofetch(\"/api/users\", { method: \"POST\", body: { name: \"Ada\" } })",
    ],
    rejects: [
      "const ofetch = (...parts) => parts\nconst users = await ofetch(\"/api/users\", { method: \"POST\", body: { name: \"Ada\" } })",
    ],
  },
  {
    library: OFETCH,
    patternKey: "factory:ofetch.create:*",
    matches: [
      "import { ofetch } from \"ofetch\"\nconst apiFetch = ofetch.create({ baseURL: \"/api\" })",
    ],
    rejects: [
      "const ofetch = makeLocalRegistry()\nconst apiFetch = ofetch.create({ baseURL: \"/api\" })",
    ],
  },
  {
    library: OFETCH,
    patternKey: "factory:ofetch.create:*>called",
    matches: [
      "import { ofetch } from \"ofetch\"\nconst apiFetch = ofetch.create({ baseURL: \"/api\" })\nconst users = await apiFetch(\"/users\")",
    ],
    rejects: [
      "const apiFetch = makeLocalRegistry()\nconst users = await apiFetch(\"/users\")",
    ],
  },
]

const UNDICI = "Undici"

export const undiciFixtures: readonly PatternFixture[] = [
  {
    library: UNDICI,
    patternKey: "call:fetch:*",
    matches: [
      "import { fetch } from \"undici\"\nconst response = await fetch(\"https://example.com/users\")",
    ],
    rejects: [
      "const fetch = (...parts) => parts\nconst response = await fetch(\"https://example.com/users\")",
    ],
  },
  {
    library: UNDICI,
    patternKey: "factory:Agent:*",
    matches: [
      "import { Agent } from \"undici\"\nconst agent = new Agent()",
    ],
    rejects: [
      "const Agent = (...parts) => parts\nconst agent = new Agent()",
    ],
  },
  {
    library: UNDICI,
    patternKey: "factory:Agent:*>call:request:*",
    matches: [
      "import { Agent } from \"undici\"\nconst agent = new Agent()\nconst { body } = await agent.request({ origin: \"http://localhost:3000\", path: \"/users\", method: \"GET\" })",
    ],
    rejects: [
      "const agent = makeLocalRegistry()\nconst { body } = await agent.request({ origin: \"http://localhost:3000\", path: \"/users\", method: \"GET\" })",
    ],
  },
  {
    library: UNDICI,
    patternKey: "factory:Pool:*",
    matches: [
      "import { Pool } from \"undici\"\nconst pool = new Pool(\"http://localhost:3000\")",
    ],
    rejects: [
      "const Pool = (...parts) => parts\nconst pool = new Pool(\"http://localhost:3000\")",
    ],
  },
  {
    library: UNDICI,
    patternKey: "factory:Pool:*>call:request:*",
    matches: [
      "import { Pool } from \"undici\"\nconst pool = new Pool(\"http://localhost:3000\")\nconst { body } = await pool.request({ path: \"/users\", method: \"GET\" })",
    ],
    rejects: [
      "const pool = makeLocalRegistry()\nconst { body } = await pool.request({ path: \"/users\", method: \"GET\" })",
    ],
  },
]

const UPFETCH = "upfetch"

export const upfetchFixtures: readonly PatternFixture[] = [
  {
    library: UPFETCH,
    patternKey: "factory:up:*",
    matches: [
      "import { up } from \"up-fetch\"\nconst upfetch = up(fetch, () => ({ baseUrl: \"https://api.example.com\" }))",
    ],
    rejects: [
      "const up = (...parts) => parts\nconst upfetch = up(fetch, () => ({ baseUrl: \"https://api.example.com\" }))",
    ],
  },
  {
    library: UPFETCH,
    patternKey: "factory:up:*>called",
    matches: [
      "import { up } from \"up-fetch\"\nconst upfetch = up(fetch, () => ({ baseUrl: \"https://api.example.com\" }))\nconst user = await upfetch(\"/users/1\", { schema })",
    ],
    rejects: [
      "const upfetch = makeLocalRegistry()\nconst user = await upfetch(\"/users/1\", { schema })",
    ],
  },
]

const WRETCH = "Wretch"

export const wretchFixtures: readonly PatternFixture[] = [
  {
    library: WRETCH,
    patternKey: "factory:default:*",
    matches: [
      "import wretch from \"wretch\"\nconst api = wretch(\"https://api.example.com\")",
    ],
    rejects: [
      "const wretch = (...parts) => parts\nconst api = wretch(\"https://api.example.com\")",
    ],
  },
  {
    library: WRETCH,
    patternKey: "factory:default:*>call:get:*",
    matches: [
      "import wretch from \"wretch\"\nconst api = wretch(\"https://api.example.com\")\nconst users = await api.url(\"/users\").get().json()",
    ],
    rejects: [
      "const api = makeLocalRegistry()\nconst users = await api.url(\"/users\").get().json()",
    ],
  },
  {
    library: WRETCH,
    patternKey: "factory:default:*>call:post:*",
    matches: [
      "import wretch from \"wretch\"\nconst api = wretch(\"https://api.example.com\")\nconst users = await api.url(\"/users\").post().json()",
    ],
    rejects: [
      "const api = makeLocalRegistry()\nconst users = await api.url(\"/users\").post().json()",
    ],
  },
  {
    library: WRETCH,
    patternKey: "factory:default:*>call:url:*",
    matches: [
      "import wretch from \"wretch\"\nconst api = wretch(\"https://api.example.com\")\nconst users = api.url(\"/users\")",
    ],
    rejects: [
      "const api = makeLocalRegistry()\nconst users = api.url(\"/users\")",
    ],
  },
  {
    library: WRETCH,
    patternKey: "factory:default:*>call:middlewares:*",
    matches: [
      "import wretch from \"wretch\"\nconst api = wretch(\"https://api.example.com\")\nconst withLogging = api.middlewares([logRequest])",
    ],
    rejects: [
      "const api = makeLocalRegistry()\nconst withLogging = api.middlewares([logRequest])",
    ],
  },
]

const XIOR = "xior"

export const xiorFixtures: readonly PatternFixture[] = [
  {
    library: XIOR,
    patternKey: "call:default.get:*",
    matches: [
      "import xior from \"xior\"\nconst response = await xior.get(\"/users\")",
    ],
    rejects: [
      "const xior = makeLocalRegistry()\nconst response = await xior.get(\"/users\")",
    ],
  },
  {
    library: XIOR,
    patternKey: "factory:default.create:*",
    matches: [
      "import xior from \"xior\"\nconst http = xior.create({ baseURL: \"https://api.example.com\" })",
    ],
    rejects: [
      "const xior = makeLocalRegistry()\nconst http = xior.create({ baseURL: \"https://api.example.com\" })",
    ],
  },
  {
    library: XIOR,
    patternKey: "factory:default.create:*>call:get:*",
    matches: [
      "import xior from \"xior\"\nconst http = xior.create({ baseURL: \"https://api.example.com\" })\nconst response = await http.get(\"/users\")",
    ],
    rejects: [
      "const http = makeLocalRegistry()\nconst response = await http.get(\"/users\")",
    ],
  },
  {
    library: XIOR,
    patternKey: "factory:default.create:*>call:post:*",
    matches: [
      "import xior from \"xior\"\nconst http = xior.create({ baseURL: \"https://api.example.com\" })\nconst response = await http.post(\"/users\")",
    ],
    rejects: [
      "const http = makeLocalRegistry()\nconst response = await http.post(\"/users\")",
    ],
  },
  {
    library: XIOR,
    patternKey: "factory:default.create:*>call:use:*",
    matches: [
      "import xior from \"xior\"\nconst http = xior.create({ baseURL: \"https://api.example.com\" })\nhttp.interceptors.request.use((config) => withToken(config))",
    ],
    rejects: [
      "const http = makeLocalRegistry()\nhttp.interceptors.request.use((config) => withToken(config))",
    ],
  },
]
