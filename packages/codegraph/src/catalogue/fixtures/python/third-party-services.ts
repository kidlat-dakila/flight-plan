import type { PatternFixture } from "@/catalogue/types"

const DJANGO_WORDPRESS = "django-wordpress"

export const djangoWordpressFixtures: readonly PatternFixture[] = [
  {
    library: DJANGO_WORDPRESS,
    patternKey: "call:Post.objects.published:*",
    matches: [
      "from wordpress.models import Post\n\nposts = Post.objects.published()",
    ],
    rejects: [
      "Post = LocalRegistry()\n\nposts = Post.objects.published()",
    ],
  },
  {
    library: DJANGO_WORDPRESS,
    patternKey: "call:Post.objects.term:*",
    matches: [
      "from wordpress.models import Post\n\nposts = Post.objects.term(\"django\")",
    ],
    rejects: [
      "Post = LocalRegistry()\n\nposts = Post.objects.term(\"django\")",
    ],
  },
]

const FACEBOOK_SDK = "facebook-sdk"

export const facebookSdkFixtures: readonly PatternFixture[] = [
  {
    library: FACEBOOK_SDK,
    patternKey: "factory:GraphAPI:*",
    matches: [
      "from facebook import GraphAPI\n\ngraph = GraphAPI(access_token=\"your_token\", version=\"2.12\")",
    ],
    rejects: [
      "def GraphAPI(*parts, **options):\n    return parts\n\ngraph = GraphAPI(access_token=\"your_token\", version=\"2.12\")",
    ],
  },
  {
    library: FACEBOOK_SDK,
    patternKey: "factory:GraphAPI:*>call:get_object:*",
    matches: [
      "from facebook import GraphAPI\n\ngraph = GraphAPI(access_token=\"your_token\", version=\"2.12\")\n\ngraph.get_object(id=\"me\")",
    ],
    rejects: [
      "graph = LocalRegistry()\n\ngraph.get_object(id=\"me\")",
    ],
  },
  {
    library: FACEBOOK_SDK,
    patternKey: "factory:GraphAPI:*>call:get_objects:*",
    matches: [
      "from facebook import GraphAPI\n\ngraph = GraphAPI(access_token=\"your_token\", version=\"2.12\")\n\ngraph.get_objects(id=\"me\")",
    ],
    rejects: [
      "graph = LocalRegistry()\n\ngraph.get_objects(id=\"me\")",
    ],
  },
  {
    library: FACEBOOK_SDK,
    patternKey: "factory:GraphAPI:*>call:get_connections:*",
    matches: [
      "from facebook import GraphAPI\n\ngraph = GraphAPI(access_token=\"your_token\", version=\"2.12\")\n\ngraph.get_connections(id=\"me\")",
    ],
    rejects: [
      "graph = LocalRegistry()\n\ngraph.get_connections(id=\"me\")",
    ],
  },
  {
    library: FACEBOOK_SDK,
    patternKey: "factory:GraphAPI:*>call:put_object:*",
    matches: [
      "from facebook import GraphAPI\n\ngraph = GraphAPI(access_token=\"your_token\", version=\"2.12\")\n\ngraph.put_object(id=\"me\")",
    ],
    rejects: [
      "graph = LocalRegistry()\n\ngraph.put_object(id=\"me\")",
    ],
  },
  {
    library: FACEBOOK_SDK,
    patternKey: "factory:GraphAPI:*>call:put_photo:*",
    matches: [
      "from facebook import GraphAPI\n\ngraph = GraphAPI(access_token=\"your_token\", version=\"2.12\")\n\ngraph.put_photo(id=\"me\")",
    ],
    rejects: [
      "graph = LocalRegistry()\n\ngraph.put_photo(id=\"me\")",
    ],
  },
]

const GSPREAD = "gspread"

export const gspreadFixtures: readonly PatternFixture[] = [
  {
    library: GSPREAD,
    patternKey: "factory:service_account:*",
    matches: [
      "from gspread import service_account\n\ngc = service_account()",
    ],
    rejects: [
      "def service_account(*parts, **options):\n    return parts\n\ngc = service_account()",
    ],
  },
  {
    library: GSPREAD,
    patternKey: "factory:service_account:*>call:open:*",
    matches: [
      "from gspread import service_account\n\ngc = service_account()\n\nsh = gc.open(\"Example spreadsheet\")",
    ],
    rejects: [
      "gc = LocalRegistry()\n\nsh = gc.open(\"Example spreadsheet\")",
    ],
  },
  {
    library: GSPREAD,
    patternKey: "factory:oauth:*",
    matches: [
      "from gspread import oauth\n\ngc = oauth()",
    ],
    rejects: [
      "def oauth(*parts, **options):\n    return parts\n\ngc = oauth()",
    ],
  },
  {
    library: GSPREAD,
    patternKey: "factory:oauth:*>call:open:*",
    matches: [
      "from gspread import oauth\n\ngc = oauth()\n\nsh = gc.open(\"Example spreadsheet\")",
    ],
    rejects: [
      "gc = LocalRegistry()\n\nsh = gc.open(\"Example spreadsheet\")",
    ],
  },
]

const TWYTHON = "Twython"

export const twythonFixtures: readonly PatternFixture[] = [
  {
    library: TWYTHON,
    patternKey: "factory:Twython:*",
    matches: [
      "from twython import Twython\n\ntwitter = Twython(APP_KEY, APP_SECRET, OAUTH_TOKEN, OAUTH_TOKEN_SECRET)",
    ],
    rejects: [
      "def Twython(*parts, **options):\n    return parts\n\ntwitter = Twython(APP_KEY, APP_SECRET, OAUTH_TOKEN, OAUTH_TOKEN_SECRET)",
    ],
  },
  {
    library: TWYTHON,
    patternKey: "factory:Twython:*>call:get_home_timeline:*",
    matches: [
      "from twython import Twython\n\ntwitter = Twython(APP_KEY, APP_SECRET, OAUTH_TOKEN, OAUTH_TOKEN_SECRET)\n\ntwitter.get_home_timeline(q=\"python\")",
    ],
    rejects: [
      "twitter = LocalRegistry()\n\ntwitter.get_home_timeline(q=\"python\")",
    ],
  },
  {
    library: TWYTHON,
    patternKey: "factory:Twython:*>call:update_status:*",
    matches: [
      "from twython import Twython\n\ntwitter = Twython(APP_KEY, APP_SECRET, OAUTH_TOKEN, OAUTH_TOKEN_SECRET)\n\ntwitter.update_status(q=\"python\")",
    ],
    rejects: [
      "twitter = LocalRegistry()\n\ntwitter.update_status(q=\"python\")",
    ],
  },
  {
    library: TWYTHON,
    patternKey: "factory:Twython:*>call:search:*",
    matches: [
      "from twython import Twython\n\ntwitter = Twython(APP_KEY, APP_SECRET, OAUTH_TOKEN, OAUTH_TOKEN_SECRET)\n\ntwitter.search(q=\"python\")",
    ],
    rejects: [
      "twitter = LocalRegistry()\n\ntwitter.search(q=\"python\")",
    ],
  },
]
