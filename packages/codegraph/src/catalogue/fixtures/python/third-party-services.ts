import type { PatternFixture } from "@/catalogue/types"

const APACHE_LIBCLOUD = "Apache Libcloud"

export const apacheLibcloudFixtures: readonly PatternFixture[] = [
  {
    library: APACHE_LIBCLOUD,
    patternKey: "factory:get_driver:*",
    matches: [
      "from libcloud.compute.providers import get_driver\n\ncls = get_driver(Provider.RACKSPACE)\ndriver = cls(\"username\", \"api key\", region=\"iad\")",
    ],
    rejects: [
      "def get_driver(*parts, **options):\n    return parts\n\ncls = get_driver(Provider.RACKSPACE)\ndriver = cls(\"username\", \"api key\", region=\"iad\")",
    ],
  },
]

const BOTO3 = "boto3"

export const boto3Fixtures: readonly PatternFixture[] = [
  {
    library: BOTO3,
    patternKey: "factory:client:*",
    matches: [
      "from boto3 import client\n\nsqs = client(\"sqs\")",
    ],
    rejects: [
      "def client(*parts, **options):\n    return parts\n\nsqs = client(\"sqs\")",
    ],
  },
  {
    library: BOTO3,
    patternKey: "factory:client:*>call:send_message:*",
    matches: [
      "from boto3 import client\n\nsqs = client(\"sqs\")\n\nsqs.send_message(QueueUrl=queue_url, MessageBody=\"hello\")",
    ],
    rejects: [
      "sqs = LocalRegistry()\n\nsqs.send_message(QueueUrl=queue_url, MessageBody=\"hello\")",
    ],
  },
  {
    library: BOTO3,
    patternKey: "factory:resource:*",
    matches: [
      "from boto3 import resource\n\ns3 = resource(\"s3\")",
    ],
    rejects: [
      "def resource(*parts, **options):\n    return parts\n\ns3 = resource(\"s3\")",
    ],
  },
]

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

const FLANKER = "Flanker"

export const flankerFixtures: readonly PatternFixture[] = [
  {
    library: FLANKER,
    patternKey: "call:address.parse:*",
    matches: [
      "from flanker.addresslib import address\n\nparsed = address.parse(\"Foo foo@example.com\")",
    ],
    rejects: [
      "address = LocalRegistry()\n\nparsed = address.parse(\"Foo foo@example.com\")",
    ],
  },
  {
    library: FLANKER,
    patternKey: "call:mime.from_string:*",
    matches: [
      "from flanker import mime\n\nmsg = mime.from_string(message_string)",
    ],
    rejects: [
      "mime = LocalRegistry()\n\nmsg = mime.from_string(message_string)",
    ],
  },
]

const GOOGLE_API_PYTHON_CLIENT = "google-api-python-client"

export const googleApiPythonClientFixtures: readonly PatternFixture[] = [
  {
    library: GOOGLE_API_PYTHON_CLIENT,
    patternKey: "factory:build:*",
    matches: [
      "from googleapiclient.discovery import build\n\nservice = build(\"drive\", \"v3\", credentials=creds)",
    ],
    rejects: [
      "def build(*parts, **options):\n    return parts\n\nservice = build(\"drive\", \"v3\", credentials=creds)",
    ],
  },
  {
    library: GOOGLE_API_PYTHON_CLIENT,
    patternKey: "factory:build:*>call:execute:*",
    matches: [
      "from googleapiclient.discovery import build\n\nservice = build(\"drive\", \"v3\", credentials=creds)\n\nresults = service.files().list(pageSize=10).execute()",
    ],
    rejects: [
      "service = LocalRegistry()\n\nresults = service.files().list(pageSize=10).execute()",
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

const IMBOX = "Imbox"

export const imboxFixtures: readonly PatternFixture[] = [
  {
    library: IMBOX,
    patternKey: "factory:Imbox:*",
    matches: [
      "from imbox import Imbox\n\nimbox = Imbox(\"imap.gmail.com\", username=\"username\", password=\"password\", ssl=True)",
    ],
    rejects: [
      "def Imbox(*parts, **options):\n    return parts\n\nimbox = Imbox(\"imap.gmail.com\", username=\"username\", password=\"password\", ssl=True)",
    ],
  },
  {
    library: IMBOX,
    patternKey: "factory:Imbox:*>call:messages:*",
    matches: [
      "from imbox import Imbox\n\nimbox = Imbox(\"imap.gmail.com\", username=\"username\", password=\"password\", ssl=True)\n\nall_inbox_messages = imbox.messages()",
    ],
    rejects: [
      "imbox = LocalRegistry()\n\nall_inbox_messages = imbox.messages()",
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

const YAGMAIL = "yagmail"

export const yagmailFixtures: readonly PatternFixture[] = [
  {
    library: YAGMAIL,
    patternKey: "factory:SMTP:*",
    matches: [
      "from yagmail import SMTP\n\nyag = SMTP(\"mygmailusername\", \"mygmailpassword\")",
    ],
    rejects: [
      "def SMTP(*parts, **options):\n    return parts\n\nyag = SMTP(\"mygmailusername\", \"mygmailpassword\")",
    ],
  },
  {
    library: YAGMAIL,
    patternKey: "factory:SMTP:*>call:send:*",
    matches: [
      "from yagmail import SMTP\n\nyag = SMTP(\"mygmailusername\", \"mygmailpassword\")\n\nyag.send(\"to@someone.com\", \"subject\", contents)",
    ],
    rejects: [
      "yag = LocalRegistry()\n\nyag.send(\"to@someone.com\", \"subject\", contents)",
    ],
  },
]
