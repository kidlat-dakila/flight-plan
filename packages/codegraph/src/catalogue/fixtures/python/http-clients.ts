import type { PatternFixture } from "@/catalogue/types"

const GREQUESTS = "grequests"

export const grequestsFixtures: readonly PatternFixture[] = [
  {
    library: GREQUESTS,
    patternKey: "call:get:*",
    matches: [
      "from grequests import get\n\nrs = (get(u) for u in urls)",
    ],
    rejects: [
      "def get(*parts, **options):\n    return parts\n\nrs = (get(u) for u in urls)",
    ],
  },
  {
    library: GREQUESTS,
    patternKey: "call:map:*",
    matches: [
      "from grequests import map\n\nresponses = map(rs, exception_handler=exception_handler)",
    ],
    rejects: [
      "def map(*parts, **options):\n    return parts\n\nresponses = map(rs, exception_handler=exception_handler)",
    ],
  },
  {
    library: GREQUESTS,
    patternKey: "call:imap:*",
    matches: [
      "from grequests import imap\n\nfor response in imap(rs, size=10):\n    print(response)",
    ],
    rejects: [
      "def imap(*parts, **options):\n    return parts\n\nfor response in imap(rs, size=10):\n    print(response)",
    ],
  },
]

const HTTPLIB2 = "httplib2"

export const httplib2Fixtures: readonly PatternFixture[] = [
  {
    library: HTTPLIB2,
    patternKey: "factory:Http:*",
    matches: [
      "from httplib2 import Http\n\nh = Http(\".cache\")",
    ],
    rejects: [
      "def Http(*parts, **options):\n    return parts\n\nh = Http(\".cache\")",
    ],
  },
  {
    library: HTTPLIB2,
    patternKey: "factory:Http:*>call:request:*",
    matches: [
      "from httplib2 import Http\n\nh = Http(\".cache\")\n\nresp, content = h.request(\"http://example.org/\", \"GET\")",
    ],
    rejects: [
      "h = LocalRegistry()\n\nresp, content = h.request(\"http://example.org/\", \"GET\")",
    ],
  },
  {
    library: HTTPLIB2,
    patternKey: "factory:Http:*>call:add_credentials:*",
    matches: [
      "from httplib2 import Http\n\nh = Http(\".cache\")\n\nh.add_credentials(\"name\", \"password\")",
    ],
    rejects: [
      "h = LocalRegistry()\n\nh.add_credentials(\"name\", \"password\")",
    ],
  },
]

const HTTPX = "HTTPX"

export const httpxFixtures: readonly PatternFixture[] = [
  {
    library: HTTPX,
    patternKey: "call:get:*",
    matches: [
      "from httpx import get\n\nr = get(\"https://www.example.org/\")",
    ],
    rejects: [
      "def get(*parts, **options):\n    return parts\n\nr = get(\"https://www.example.org/\")",
    ],
  },
  {
    library: HTTPX,
    patternKey: "factory:Client:*",
    matches: [
      "from httpx import Client\n\nclient = Client(base_url=\"https://api.example.com\")",
    ],
    rejects: [
      "def Client(*parts, **options):\n    return parts\n\nclient = Client(base_url=\"https://api.example.com\")",
    ],
  },
  {
    library: HTTPX,
    patternKey: "factory:Client:*>call:get:*",
    matches: [
      "from httpx import Client\n\nclient = Client(base_url=\"https://api.example.com\")\n\nr = client.get(\"/users\")",
    ],
    rejects: [
      "client = LocalRegistry()\n\nr = client.get(\"/users\")",
    ],
  },
]

const REQUESTS = "Requests"

export const requestsFixtures: readonly PatternFixture[] = [
  {
    library: REQUESTS,
    patternKey: "call:get:*",
    matches: [
      "from requests import get\n\nr = get(\"https://api.github.com/user\", auth=(\"user\", \"pass\"))",
    ],
    rejects: [
      "def get(*parts, **options):\n    return parts\n\nr = get(\"https://api.github.com/user\", auth=(\"user\", \"pass\"))",
    ],
  },
  {
    library: REQUESTS,
    patternKey: "call:request:*",
    matches: [
      "from requests import request\n\nr = request(\"GET\", \"https://httpbin.org/get\")",
    ],
    rejects: [
      "def request(*parts, **options):\n    return parts\n\nr = request(\"GET\", \"https://httpbin.org/get\")",
    ],
  },
]

const TREQ = "treq"

export const treqFixtures: readonly PatternFixture[] = [
  {
    library: TREQ,
    patternKey: "call:get:*",
    matches: [
      "from treq import get\n\nresponse = await get(\"https://httpbin.org/get\")",
    ],
    rejects: [
      "def get(*parts, **options):\n    return parts\n\nresponse = await get(\"https://httpbin.org/get\")",
    ],
  },
  {
    library: TREQ,
    patternKey: "call:request:*",
    matches: [
      "from treq import request\n\nresponse = await request(\"GET\", \"https://httpbin.org/get\")",
    ],
    rejects: [
      "def request(*parts, **options):\n    return parts\n\nresponse = await request(\"GET\", \"https://httpbin.org/get\")",
    ],
  },
]

const URLLIB3 = "urllib3"

export const urllib3Fixtures: readonly PatternFixture[] = [
  {
    library: URLLIB3,
    patternKey: "call:request:*",
    matches: [
      "from urllib3 import request\n\nresp = request(\"GET\", \"https://httpbin.org/robots.txt\")",
    ],
    rejects: [
      "def request(*parts, **options):\n    return parts\n\nresp = request(\"GET\", \"https://httpbin.org/robots.txt\")",
    ],
  },
  {
    library: URLLIB3,
    patternKey: "factory:PoolManager:*",
    matches: [
      "from urllib3 import PoolManager\n\nhttp = PoolManager()",
    ],
    rejects: [
      "def PoolManager(*parts, **options):\n    return parts\n\nhttp = PoolManager()",
    ],
  },
  {
    library: URLLIB3,
    patternKey: "factory:PoolManager:*>call:request:*",
    matches: [
      "from urllib3 import PoolManager\n\nhttp = PoolManager()\n\nresp = http.request(\"GET\", \"https://httpbin.org/robots.txt\")",
    ],
    rejects: [
      "http = LocalRegistry()\n\nresp = http.request(\"GET\", \"https://httpbin.org/robots.txt\")",
    ],
  },
  {
    library: URLLIB3,
    patternKey: "factory:HTTPConnectionPool:*",
    matches: [
      "from urllib3 import HTTPConnectionPool\n\npool = HTTPConnectionPool(\"httpbin.org\", maxsize=1)",
    ],
    rejects: [
      "def HTTPConnectionPool(*parts, **options):\n    return parts\n\npool = HTTPConnectionPool(\"httpbin.org\", maxsize=1)",
    ],
  },
  {
    library: URLLIB3,
    patternKey: "factory:HTTPConnectionPool:*>call:request:*",
    matches: [
      "from urllib3 import HTTPConnectionPool\n\npool = HTTPConnectionPool(\"httpbin.org\", maxsize=1)\n\nresp = pool.request(\"GET\", \"/robots.txt\")",
    ],
    rejects: [
      "pool = LocalRegistry()\n\nresp = pool.request(\"GET\", \"/robots.txt\")",
    ],
  },
]
