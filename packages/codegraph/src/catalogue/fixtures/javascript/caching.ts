import type { PatternFixture } from "@/catalogue/types"

const APICACHE = "apicache"

export const apicacheFixtures: readonly PatternFixture[] = [
  {
    library: APICACHE,
    patternKey: "call:default.middleware:*",
    matches: [
      "import apicache from \"apicache\"\napp.use(apicache.middleware(\"5 minutes\"))",
    ],
    rejects: [
      "const apicache = makeLocalRegistry()\napp.use(apicache.middleware(\"5 minutes\"))",
    ],
  },
  {
    library: APICACHE,
    patternKey: "call:default.clear:*",
    matches: [
      "import apicache from \"apicache\"\napicache.clear(\"/api/collection\")",
    ],
    rejects: [
      "const apicache = makeLocalRegistry()\napicache.clear(\"/api/collection\")",
    ],
  },
]

const BENTOCACHE = "Bentocache"

export const bentocacheFixtures: readonly PatternFixture[] = [
  {
    library: BENTOCACHE,
    patternKey: "factory:BentoCache:*",
    matches: [
      "import { BentoCache } from \"bentocache\"\nconst bento = new BentoCache({ default: \"memory\", stores })",
    ],
    rejects: [
      "const BentoCache = (...parts) => parts\nconst bento = new BentoCache({ default: \"memory\", stores })",
    ],
  },
  {
    library: BENTOCACHE,
    patternKey: "factory:BentoCache:*>call:getOrSet:*",
    matches: [
      "import { BentoCache } from \"bentocache\"\nconst bento = new BentoCache({ default: \"memory\", stores })\nconst user = await bento.getOrSet({ key: \"user:1\", factory: () => User.find(1) })",
    ],
    rejects: [
      "const bento = makeLocalRegistry()\nconst user = await bento.getOrSet({ key: \"user:1\", factory: () => User.find(1) })",
    ],
  },
  {
    library: BENTOCACHE,
    patternKey: "factory:BentoCache:*>call:get:*",
    matches: [
      "import { BentoCache } from \"bentocache\"\nconst bento = new BentoCache({ default: \"memory\", stores })\nbento.get({ key: \"user:1\" })",
    ],
    rejects: [
      "const bento = makeLocalRegistry()\nbento.get({ key: \"user:1\" })",
    ],
  },
  {
    library: BENTOCACHE,
    patternKey: "factory:BentoCache:*>call:set:*",
    matches: [
      "import { BentoCache } from \"bentocache\"\nconst bento = new BentoCache({ default: \"memory\", stores })\nbento.set({ key: \"user:1\" })",
    ],
    rejects: [
      "const bento = makeLocalRegistry()\nbento.set({ key: \"user:1\" })",
    ],
  },
  {
    library: BENTOCACHE,
    patternKey: "factory:BentoCache:*>call:deleteByTag:*",
    matches: [
      "import { BentoCache } from \"bentocache\"\nconst bento = new BentoCache({ default: \"memory\", stores })\nbento.deleteByTag({ key: \"user:1\" })",
    ],
    rejects: [
      "const bento = makeLocalRegistry()\nbento.deleteByTag({ key: \"user:1\" })",
    ],
  },
  {
    library: BENTOCACHE,
    patternKey: "factory:BentoCache:*>call:namespace:*",
    matches: [
      "import { BentoCache } from \"bentocache\"\nconst bento = new BentoCache({ default: \"memory\", stores })\nconst users = bento.namespace(\"users\")",
    ],
    rejects: [
      "const bento = makeLocalRegistry()\nconst users = bento.namespace(\"users\")",
    ],
  },
]

const CACHEABLE = "Cacheable"

export const cacheableFixtures: readonly PatternFixture[] = [
  {
    library: CACHEABLE,
    patternKey: "factory:Cacheable:*",
    matches: [
      "import { Cacheable } from \"cacheable\"\nconst cache = new Cacheable()",
    ],
    rejects: [
      "const Cacheable = (...parts) => parts\nconst cache = new Cacheable()",
    ],
  },
  {
    library: CACHEABLE,
    patternKey: "factory:Cacheable:*>call:get:*",
    matches: [
      "import { Cacheable } from \"cacheable\"\nconst cache = new Cacheable()\ncache.get(\"key\")",
    ],
    rejects: [
      "const cache = makeLocalRegistry()\ncache.get(\"key\")",
    ],
  },
  {
    library: CACHEABLE,
    patternKey: "factory:Cacheable:*>call:set:*",
    matches: [
      "import { Cacheable } from \"cacheable\"\nconst cache = new Cacheable()\ncache.set(\"key\")",
    ],
    rejects: [
      "const cache = makeLocalRegistry()\ncache.set(\"key\")",
    ],
  },
  {
    library: CACHEABLE,
    patternKey: "factory:Cacheable:*>call:getOrSet:*",
    matches: [
      "import { Cacheable } from \"cacheable\"\nconst cache = new Cacheable()\nconst user = await cache.getOrSet(\"user:1\", async () => loadUser(1), { ttl: \"1h\" })",
    ],
    rejects: [
      "const cache = makeLocalRegistry()\nconst user = await cache.getOrSet(\"user:1\", async () => loadUser(1), { ttl: \"1h\" })",
    ],
  },
  {
    library: CACHEABLE,
    patternKey: "factory:Cacheable:*>call:wrap:*",
    matches: [
      "import { Cacheable } from \"cacheable\"\nconst cache = new Cacheable()\nconst cachedLoadUser = cache.wrap(loadUser, { ttl: \"1h\" })",
    ],
    rejects: [
      "const cache = makeLocalRegistry()\nconst cachedLoadUser = cache.wrap(loadUser, { ttl: \"1h\" })",
    ],
  },
]

const CACHIFIED = "cachified"

export const cachifiedFixtures: readonly PatternFixture[] = [
  {
    library: CACHIFIED,
    patternKey: "call:cachified:*",
    matches: [
      "import { cachified } from \"@epic-web/cachified\"\nconst user = await cachified({ key: \"user-1\", cache, getFreshValue: async () => loadUser(1), ttl: 300000 })",
    ],
    rejects: [
      "const cachified = (...parts) => parts\nconst user = await cachified({ key: \"user-1\", cache, getFreshValue: async () => loadUser(1), ttl: 300000 })",
    ],
  },
  {
    library: CACHIFIED,
    patternKey: "call:softPurge:*",
    matches: [
      "import { softPurge } from \"@epic-web/cachified\"\nawait softPurge({ cache, key: \"user-1\" })",
    ],
    rejects: [
      "const softPurge = (...parts) => parts\nawait softPurge({ cache, key: \"user-1\" })",
    ],
  },
]

const KEYV = "Keyv"

export const keyvFixtures: readonly PatternFixture[] = [
  {
    library: KEYV,
    patternKey: "factory:default:*",
    matches: [
      "import Keyv from \"keyv\"\nconst keyv = new Keyv()",
    ],
    rejects: [
      "const Keyv = (...parts) => parts\nconst keyv = new Keyv()",
    ],
  },
  {
    library: KEYV,
    patternKey: "factory:default:*>call:get:*",
    matches: [
      "import Keyv from \"keyv\"\nconst keyv = new Keyv()\nkeyv.get(\"key\")",
    ],
    rejects: [
      "const keyv = makeLocalRegistry()\nkeyv.get(\"key\")",
    ],
  },
  {
    library: KEYV,
    patternKey: "factory:default:*>call:set:*",
    matches: [
      "import Keyv from \"keyv\"\nconst keyv = new Keyv()\nkeyv.set(\"key\")",
    ],
    rejects: [
      "const keyv = makeLocalRegistry()\nkeyv.set(\"key\")",
    ],
  },
  {
    library: KEYV,
    patternKey: "factory:default:*>call:delete:*",
    matches: [
      "import Keyv from \"keyv\"\nconst keyv = new Keyv()\nkeyv.delete(\"key\")",
    ],
    rejects: [
      "const keyv = makeLocalRegistry()\nkeyv.delete(\"key\")",
    ],
  },
  {
    library: KEYV,
    patternKey: "factory:default:*>call:clear:*",
    matches: [
      "import Keyv from \"keyv\"\nconst keyv = new Keyv()\nkeyv.clear(\"key\")",
    ],
    rejects: [
      "const keyv = makeLocalRegistry()\nkeyv.clear(\"key\")",
    ],
  },
  {
    library: KEYV,
    patternKey: "factory:default:*>call:has:*",
    matches: [
      "import Keyv from \"keyv\"\nconst keyv = new Keyv()\nkeyv.has(\"key\")",
    ],
    rejects: [
      "const keyv = makeLocalRegistry()\nkeyv.has(\"key\")",
    ],
  },
]

const KV_JS = "KV.js"

export const kvJsFixtures: readonly PatternFixture[] = [
  {
    library: KV_JS,
    patternKey: "factory:default:*",
    matches: [
      "import kvjs from \"@heyputer/kv.js\"\nconst kv = new kvjs()",
    ],
    rejects: [
      "const kvjs = (...parts) => parts\nconst kv = new kvjs()",
    ],
  },
  {
    library: KV_JS,
    patternKey: "factory:default:*>call:set:*",
    matches: [
      "import kvjs from \"@heyputer/kv.js\"\nconst kv = new kvjs()\nkv.set(\"key\")",
    ],
    rejects: [
      "const kv = makeLocalRegistry()\nkv.set(\"key\")",
    ],
  },
  {
    library: KV_JS,
    patternKey: "factory:default:*>call:get:*",
    matches: [
      "import kvjs from \"@heyputer/kv.js\"\nconst kv = new kvjs()\nkv.get(\"key\")",
    ],
    rejects: [
      "const kv = makeLocalRegistry()\nkv.get(\"key\")",
    ],
  },
  {
    library: KV_JS,
    patternKey: "factory:default:*>call:del:*",
    matches: [
      "import kvjs from \"@heyputer/kv.js\"\nconst kv = new kvjs()\nkv.del(\"key\")",
    ],
    rejects: [
      "const kv = makeLocalRegistry()\nkv.del(\"key\")",
    ],
  },
  {
    library: KV_JS,
    patternKey: "factory:default:*>call:expire:*",
    matches: [
      "import kvjs from \"@heyputer/kv.js\"\nconst kv = new kvjs()\nkv.expire(\"key\")",
    ],
    rejects: [
      "const kv = makeLocalRegistry()\nkv.expire(\"key\")",
    ],
  },
  {
    library: KV_JS,
    patternKey: "factory:default:*>call:incr:*",
    matches: [
      "import kvjs from \"@heyputer/kv.js\"\nconst kv = new kvjs()\nkv.incr(\"key\")",
    ],
    rejects: [
      "const kv = makeLocalRegistry()\nkv.incr(\"key\")",
    ],
  },
  {
    library: KV_JS,
    patternKey: "factory:default:*>call:exists:*",
    matches: [
      "import kvjs from \"@heyputer/kv.js\"\nconst kv = new kvjs()\nkv.exists(\"key\")",
    ],
    rejects: [
      "const kv = makeLocalRegistry()\nkv.exists(\"key\")",
    ],
  },
]

const LRU_CACHE = "lru-cache"

export const lruCacheFixtures: readonly PatternFixture[] = [
  {
    library: LRU_CACHE,
    patternKey: "factory:LRUCache:*",
    matches: [
      "import { LRUCache } from \"lru-cache\"\nconst cache = new LRUCache({ max: 500 })",
    ],
    rejects: [
      "const LRUCache = (...parts) => parts\nconst cache = new LRUCache({ max: 500 })",
    ],
  },
  {
    library: LRU_CACHE,
    patternKey: "factory:LRUCache:*>call:set:*",
    matches: [
      "import { LRUCache } from \"lru-cache\"\nconst cache = new LRUCache({ max: 500 })\ncache.set(\"key\")",
    ],
    rejects: [
      "const cache = makeLocalRegistry()\ncache.set(\"key\")",
    ],
  },
  {
    library: LRU_CACHE,
    patternKey: "factory:LRUCache:*>call:get:*",
    matches: [
      "import { LRUCache } from \"lru-cache\"\nconst cache = new LRUCache({ max: 500 })\ncache.get(\"key\")",
    ],
    rejects: [
      "const cache = makeLocalRegistry()\ncache.get(\"key\")",
    ],
  },
  {
    library: LRU_CACHE,
    patternKey: "factory:LRUCache:*>call:fetch:*",
    matches: [
      "import { LRUCache } from \"lru-cache\"\nconst cache = new LRUCache({ max: 500 })\ncache.fetch(\"key\")",
    ],
    rejects: [
      "const cache = makeLocalRegistry()\ncache.fetch(\"key\")",
    ],
  },
]

const UNSTORAGE = "Unstorage"

export const unstorageFixtures: readonly PatternFixture[] = [
  {
    library: UNSTORAGE,
    patternKey: "factory:createStorage:*",
    matches: [
      "import { createStorage } from \"unstorage\"\nconst storage = createStorage()",
    ],
    rejects: [
      "const createStorage = (...parts) => parts\nconst storage = createStorage()",
    ],
  },
  {
    library: UNSTORAGE,
    patternKey: "factory:createStorage:*>call:getItem:*",
    matches: [
      "import { createStorage } from \"unstorage\"\nconst storage = createStorage()\nstorage.getItem(\"key\")",
    ],
    rejects: [
      "const storage = makeLocalRegistry()\nstorage.getItem(\"key\")",
    ],
  },
  {
    library: UNSTORAGE,
    patternKey: "factory:createStorage:*>call:setItem:*",
    matches: [
      "import { createStorage } from \"unstorage\"\nconst storage = createStorage()\nstorage.setItem(\"key\")",
    ],
    rejects: [
      "const storage = makeLocalRegistry()\nstorage.setItem(\"key\")",
    ],
  },
  {
    library: UNSTORAGE,
    patternKey: "factory:createStorage:*>call:hasItem:*",
    matches: [
      "import { createStorage } from \"unstorage\"\nconst storage = createStorage()\nstorage.hasItem(\"key\")",
    ],
    rejects: [
      "const storage = makeLocalRegistry()\nstorage.hasItem(\"key\")",
    ],
  },
  {
    library: UNSTORAGE,
    patternKey: "factory:createStorage:*>call:getKeys:*",
    matches: [
      "import { createStorage } from \"unstorage\"\nconst storage = createStorage()\nstorage.getKeys(\"key\")",
    ],
    rejects: [
      "const storage = makeLocalRegistry()\nstorage.getKeys(\"key\")",
    ],
  },
  {
    library: UNSTORAGE,
    patternKey: "factory:createStorage:*>call:clear:*",
    matches: [
      "import { createStorage } from \"unstorage\"\nconst storage = createStorage()\nstorage.clear(\"key\")",
    ],
    rejects: [
      "const storage = makeLocalRegistry()\nstorage.clear(\"key\")",
    ],
  },
]
