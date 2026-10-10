import type { PatternFixture } from "@/catalogue/types"

const BEAKER = "Beaker"

export const beakerFixtures: readonly PatternFixture[] = [
  {
    library: BEAKER,
    patternKey: "factory:CacheManager:*",
    matches: [
      "from beaker.cache import CacheManager\n\ncache = CacheManager(**parse_cache_config_options(cache_opts))",
    ],
    rejects: [
      "def CacheManager(*parts, **options):\n    return parts\n\ncache = CacheManager(**parse_cache_config_options(cache_opts))",
    ],
  },
  {
    library: BEAKER,
    patternKey: "factory:CacheManager:*>decorator:cache:*",
    matches: [
      "from beaker.cache import CacheManager\n\ncache = CacheManager(**parse_cache_config_options(cache_opts))\n\n@cache.cache(\"my_search_func\", expire=3600)\ndef get_results(search_param):\n    return do_search(search_param)",
    ],
    rejects: [
      "cache = LocalRegistry()\n\n@cache.cache(\"my_search_func\", expire=3600)\ndef get_results(search_param):\n    return do_search(search_param)",
    ],
  },
  {
    library: BEAKER,
    patternKey: "factory:CacheManager:*>call:invalidate:*",
    matches: [
      "from beaker.cache import CacheManager\n\ncache = CacheManager(**parse_cache_config_options(cache_opts))\n\ncache.invalidate(get_results, \"my_search_func\", \"gophers\")",
    ],
    rejects: [
      "cache = LocalRegistry()\n\ncache.invalidate(get_results, \"my_search_func\", \"gophers\")",
    ],
  },
]

const DISKCACHE = "DiskCache"

export const diskcacheFixtures: readonly PatternFixture[] = [
  {
    library: DISKCACHE,
    patternKey: "factory:Cache:*",
    matches: [
      "from diskcache import Cache\n\ncache = Cache(\"/tmp/mycachedir\")",
    ],
    rejects: [
      "def Cache(*parts, **options):\n    return parts\n\ncache = Cache(\"/tmp/mycachedir\")",
    ],
  },
  {
    library: DISKCACHE,
    patternKey: "factory:Cache:*>decorator:memoize:*",
    matches: [
      "from diskcache import Cache\n\ncache = Cache(\"/tmp/mycachedir\")\n\n@cache.memoize()\ndef fibonacci(number):\n    return number",
    ],
    rejects: [
      "cache = LocalRegistry()\n\n@cache.memoize()\ndef fibonacci(number):\n    return number",
    ],
  },
  {
    library: DISKCACHE,
    patternKey: "factory:Cache:*>call:get:*",
    matches: [
      "from diskcache import Cache\n\ncache = Cache(\"/tmp/mycachedir\")\n\nvalue = cache.get(\"key\")",
    ],
    rejects: [
      "cache = LocalRegistry()\n\nvalue = cache.get(\"key\")",
    ],
  },
  {
    library: DISKCACHE,
    patternKey: "factory:FanoutCache:*",
    matches: [
      "from diskcache import FanoutCache\n\ncache = FanoutCache(\"/tmp/mycachedir\")",
    ],
    rejects: [
      "def FanoutCache(*parts, **options):\n    return parts\n\ncache = FanoutCache(\"/tmp/mycachedir\")",
    ],
  },
]

const DJANGO_CACHE_MACHINE = "django-cache-machine"

export const djangoCacheMachineFixtures: readonly PatternFixture[] = [
  {
    library: DJANGO_CACHE_MACHINE,
    patternKey: "factory:CachingManager:*",
    matches: [
      "from caching.base import CachingManager\n\nobjects = CachingManager()",
    ],
    rejects: [
      "def CachingManager(*parts, **options):\n    return parts\n\nobjects = CachingManager()",
    ],
  },
]

const DJANGO_CACHEOPS = "django-cacheops"

export const djangoCacheopsFixtures: readonly PatternFixture[] = [
  {
    library: DJANGO_CACHEOPS,
    patternKey: "decorator:cached_as:*",
    matches: [
      "from cacheops import cached_as\n\n@cached_as(Article, timeout=120)\ndef article_stats():\n    return Article.objects.count()",
    ],
    rejects: [
      "def cached_as(*parts, **options):\n    return parts\n\n@cached_as(Article, timeout=120)\ndef article_stats():\n    return Article.objects.count()",
    ],
  },
  {
    library: DJANGO_CACHEOPS,
    patternKey: "decorator:cached:*",
    matches: [
      "from cacheops import cached\n\n@cached(timeout=60)\ndef top_articles(category):\n    return list(Article.objects.filter(category=category))",
    ],
    rejects: [
      "def cached(*parts, **options):\n    return parts\n\n@cached(timeout=60)\ndef top_articles(category):\n    return list(Article.objects.filter(category=category))",
    ],
  },
  {
    library: DJANGO_CACHEOPS,
    patternKey: "decorator:cached_view_as:*",
    matches: [
      "from cacheops import cached_view_as\n\n@cached_view_as(News)\ndef news_index(request):\n    return render(request, \"news/index.html\")",
    ],
    rejects: [
      "def cached_view_as(*parts, **options):\n    return parts\n\n@cached_view_as(News)\ndef news_index(request):\n    return render(request, \"news/index.html\")",
    ],
  },
  {
    library: DJANGO_CACHEOPS,
    patternKey: "call:invalidate_obj:*",
    matches: [
      "from cacheops import invalidate_obj\n\ninvalidate_obj(some_article)",
    ],
    rejects: [
      "def invalidate_obj(*parts, **options):\n    return parts\n\ninvalidate_obj(some_article)",
    ],
  },
]

const DOGPILE_CACHE = "dogpile.cache"

export const dogpileCacheFixtures: readonly PatternFixture[] = [
  {
    library: DOGPILE_CACHE,
    patternKey: "factory:make_region:*",
    matches: [
      "from dogpile.cache import make_region\n\nregion = make_region().configure(\"dogpile.cache.redis\")",
    ],
    rejects: [
      "def make_region(*parts, **options):\n    return parts\n\nregion = make_region().configure(\"dogpile.cache.redis\")",
    ],
  },
  {
    library: DOGPILE_CACHE,
    patternKey: "factory:make_region:*>decorator:cache_on_arguments:*",
    matches: [
      "from dogpile.cache import make_region\n\nregion = make_region().configure(\"dogpile.cache.redis\")\n\n@region.cache_on_arguments()\ndef load_user_info(user_id):\n    return some_database.lookup_user_by_id(user_id)",
    ],
    rejects: [
      "region = LocalRegistry()\n\n@region.cache_on_arguments()\ndef load_user_info(user_id):\n    return some_database.lookup_user_by_id(user_id)",
    ],
  },
  {
    library: DOGPILE_CACHE,
    patternKey: "factory:make_region:*>call:get:*",
    matches: [
      "from dogpile.cache import make_region\n\nregion = make_region().configure(\"dogpile.cache.redis\")\n\nvalue = region.get(\"some key\")",
    ],
    rejects: [
      "region = LocalRegistry()\n\nvalue = region.get(\"some key\")",
    ],
  },
]

const HERMESCACHE = "HermesCache"

export const hermescacheFixtures: readonly PatternFixture[] = [
  {
    library: HERMESCACHE,
    patternKey: "factory:Hermes:*",
    matches: [
      "from hermes import Hermes\n\ncache = Hermes(hermes.backend.redis.Backend, ttl=600)",
    ],
    rejects: [
      "def Hermes(*parts, **options):\n    return parts\n\ncache = Hermes(hermes.backend.redis.Backend, ttl=600)",
    ],
  },
  {
    library: HERMESCACHE,
    patternKey: "factory:Hermes:*>call:clean:*",
    matches: [
      "from hermes import Hermes\n\ncache = Hermes(hermes.backend.redis.Backend, ttl=600)\n\ncache.clean((\"math\",))",
    ],
    rejects: [
      "cache = LocalRegistry()\n\ncache.clean((\"math\",))",
    ],
  },
  {
    library: HERMESCACHE,
    patternKey: "factory:Hermes:*>called",
    matches: [
      "from hermes import Hermes\n\ncache = Hermes(hermes.backend.redis.Backend, ttl=600)\n\n@cache(tags=(\"math\",))\ndef foo(a, b):\n    return a * b",
    ],
    rejects: [
      "cache = LocalRegistry()\n\n@cache(tags=(\"math\",))\ndef foo(a, b):\n    return a * b",
    ],
  },
]

const PYLIBMC = "pylibmc"

export const pylibmcFixtures: readonly PatternFixture[] = [
  {
    library: PYLIBMC,
    patternKey: "factory:Client:*",
    matches: [
      "from pylibmc import Client\n\nmc = Client([\"127.0.0.1\"], binary=True)",
    ],
    rejects: [
      "def Client(*parts, **options):\n    return parts\n\nmc = Client([\"127.0.0.1\"], binary=True)",
    ],
  },
  {
    library: PYLIBMC,
    patternKey: "factory:Client:*>call:get:*",
    matches: [
      "from pylibmc import Client\n\nmc = Client([\"127.0.0.1\"], binary=True)\n\nmc.get(\"key\")",
    ],
    rejects: [
      "mc = LocalRegistry()\n\nmc.get(\"key\")",
    ],
  },
  {
    library: PYLIBMC,
    patternKey: "factory:Client:*>call:set:*",
    matches: [
      "from pylibmc import Client\n\nmc = Client([\"127.0.0.1\"], binary=True)\n\nmc.set(\"key\")",
    ],
    rejects: [
      "mc = LocalRegistry()\n\nmc.set(\"key\")",
    ],
  },
  {
    library: PYLIBMC,
    patternKey: "factory:Client:*>call:get_multi:*",
    matches: [
      "from pylibmc import Client\n\nmc = Client([\"127.0.0.1\"], binary=True)\n\nmc.get_multi(\"key\")",
    ],
    rejects: [
      "mc = LocalRegistry()\n\nmc.get_multi(\"key\")",
    ],
  },
  {
    library: PYLIBMC,
    patternKey: "factory:Client:*>call:set_multi:*",
    matches: [
      "from pylibmc import Client\n\nmc = Client([\"127.0.0.1\"], binary=True)\n\nmc.set_multi(\"key\")",
    ],
    rejects: [
      "mc = LocalRegistry()\n\nmc.set_multi(\"key\")",
    ],
  },
  {
    library: PYLIBMC,
    patternKey: "factory:Client:*>call:add:*",
    matches: [
      "from pylibmc import Client\n\nmc = Client([\"127.0.0.1\"], binary=True)\n\nmc.add(\"key\")",
    ],
    rejects: [
      "mc = LocalRegistry()\n\nmc.add(\"key\")",
    ],
  },
]

const REDIS_PY = "redis-py"

export const redisPyFixtures: readonly PatternFixture[] = [
  {
    library: REDIS_PY,
    patternKey: "factory:Redis:*",
    matches: [
      "from redis import Redis\n\nr = Redis(host=\"localhost\", port=6379, db=0)",
    ],
    rejects: [
      "def Redis(*parts, **options):\n    return parts\n\nr = Redis(host=\"localhost\", port=6379, db=0)",
    ],
  },
  {
    library: REDIS_PY,
    patternKey: "factory:Redis:*>call:set:*",
    matches: [
      "from redis import Redis\n\nr = Redis(host=\"localhost\", port=6379, db=0)\n\nr.set(\"key\")",
    ],
    rejects: [
      "r = LocalRegistry()\n\nr.set(\"key\")",
    ],
  },
  {
    library: REDIS_PY,
    patternKey: "factory:Redis:*>call:hset:*",
    matches: [
      "from redis import Redis\n\nr = Redis(host=\"localhost\", port=6379, db=0)\n\nr.hset(\"key\")",
    ],
    rejects: [
      "r = LocalRegistry()\n\nr.hset(\"key\")",
    ],
  },
  {
    library: REDIS_PY,
    patternKey: "factory:Redis:*>call:pipeline:*",
    matches: [
      "from redis import Redis\n\nr = Redis(host=\"localhost\", port=6379, db=0)\n\npipe = r.pipeline()",
    ],
    rejects: [
      "r = LocalRegistry()\n\npipe = r.pipeline()",
    ],
  },
  {
    library: REDIS_PY,
    patternKey: "factory:Redis:*>call:pubsub:*",
    matches: [
      "from redis import Redis\n\nr = Redis(host=\"localhost\", port=6379, db=0)\n\np = r.pubsub()",
    ],
    rejects: [
      "r = LocalRegistry()\n\np = r.pubsub()",
    ],
  },
]
