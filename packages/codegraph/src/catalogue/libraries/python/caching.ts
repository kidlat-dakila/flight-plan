import type { CatalogueLibrary } from "@/catalogue/types"

export const beakerLibrary: CatalogueLibrary = {
  name: "Beaker",
  specifiers: ["beaker", "beaker.cache"],
  documentedVersion: "1.14",
  category: "caching",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "CacheManager",
      methods: [
        { kind: "decorator", name: "cache", makes: "cache" },
        { kind: "call", name: "invalidate", slots: [], makes: "cache" },
      ],
    },
  ],
}

export const diskcacheLibrary: CatalogueLibrary = {
  name: "DiskCache",
  specifiers: ["diskcache"],
  documentedVersion: "5.6",
  category: "caching",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "Cache",
      methods: [
        { kind: "decorator", name: "memoize", makes: "cache" },
        { kind: "call", name: "get", slots: [], makes: "cache" },
      ],
    },
    {
      kind: "factory",
      name: "FanoutCache",
      makes: "cache",
      methods: [],
    },
  ],
}

export const djangoCacheMachineLibrary: CatalogueLibrary = {
  name: "django-cache-machine",
  specifiers: ["caching", "caching.base"],
  documentedVersion: "1.2",
  category: "caching",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "CachingManager",
      makes: "cache",
      methods: [],
    },
  ],
}

export const djangoCacheopsLibrary: CatalogueLibrary = {
  name: "django-cacheops",
  specifiers: ["cacheops"],
  documentedVersion: "7.2",
  category: "caching",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "decorator", name: "cached_as", makes: "cache" },
    { kind: "decorator", name: "cached", makes: "cache" },
    { kind: "decorator", name: "cached_view_as", makes: "cache" },
    { kind: "call", name: "invalidate_obj", slots: [], makes: "cache" },
  ],
}

export const dogpileCacheLibrary: CatalogueLibrary = {
  name: "dogpile.cache",
  specifiers: ["dogpile.cache"],
  documentedVersion: "1.5",
  category: "caching",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "make_region",
      methods: [
        { kind: "decorator", name: "cache_on_arguments", makes: "cache" },
        { kind: "call", name: "get", slots: [], makes: "cache" },
      ],
    },
  ],
}

export const hermescacheLibrary: CatalogueLibrary = {
  name: "HermesCache",
  specifiers: ["hermes"],
  documentedVersion: "1.2",
  category: "caching",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "Hermes",
      methods: [
        { kind: "call", name: "clean", slots: [], makes: "cache" },
      ],
      called: {
        slots: [],
        makes: "cache",
      },
    },
  ],
}

export const pylibmcLibrary: CatalogueLibrary = {
  name: "pylibmc",
  specifiers: ["pylibmc"],
  documentedVersion: "1.6",
  category: "caching",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "Client",
      methods: [
        { kind: "call", name: "get", slots: [], makes: "cache" },
        { kind: "call", name: "set", slots: [], makes: "cache" },
        { kind: "call", name: "get_multi", slots: [], makes: "cache" },
        { kind: "call", name: "set_multi", slots: [], makes: "cache" },
        { kind: "call", name: "add", slots: [], makes: "cache" },
      ],
    },
  ],
}

export const redisPyLibrary: CatalogueLibrary = {
  name: "redis-py",
  specifiers: ["redis"],
  documentedVersion: "8.1",
  category: "caching",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "Redis",
      methods: [
        { kind: "call", name: "set", slots: [], makes: "cache" },
        { kind: "call", name: "hset", slots: [], makes: "cache" },
        { kind: "call", name: "pipeline", slots: [], makes: "transaction" },
        { kind: "call", name: "pubsub", slots: [], makes: "publish" },
      ],
    },
  ],
}
