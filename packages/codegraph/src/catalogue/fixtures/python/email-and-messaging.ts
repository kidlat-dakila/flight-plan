import type { PatternFixture } from "@/catalogue/types"

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

const PYTHON_SLACK_SDK = "Python Slack SDK"

export const slackSdkFixtures: readonly PatternFixture[] = [
  {
    library: PYTHON_SLACK_SDK,
    patternKey: "factory:WebClient:*",
    matches: [
      "from slack_sdk import WebClient\n\nclient = WebClient(token=os.environ[\"SLACK_BOT_TOKEN\"])",
    ],
    rejects: [
      "def WebClient(*parts, **options):\n    return parts\n\nclient = WebClient(token=os.environ[\"SLACK_BOT_TOKEN\"])",
    ],
  },
  {
    library: PYTHON_SLACK_SDK,
    patternKey: "factory:WebClient:*>call:chat_postMessage:*",
    matches: [
      "from slack_sdk import WebClient\n\nclient = WebClient(token=os.environ[\"SLACK_BOT_TOKEN\"])\nresponse = client.chat_postMessage(channel=\"#random\", text=\"Hello world!\")",
    ],
    rejects: [
      "client = LocalRegistry()\nresponse = client.chat_postMessage(channel=\"#random\", text=\"Hello world!\")",
    ],
  },
  {
    library: PYTHON_SLACK_SDK,
    patternKey: "factory:WebClient:*>call:files_upload_v2:*",
    matches: [
      "from slack_sdk import WebClient\n\nclient = WebClient(token=os.environ[\"SLACK_BOT_TOKEN\"])\nresponse = client.files_upload_v2(channel=\"C0123456789\", file=filepath)",
    ],
    rejects: [
      "client = LocalRegistry()\nresponse = client.files_upload_v2(channel=\"C0123456789\", file=filepath)",
    ],
  },
  {
    library: PYTHON_SLACK_SDK,
    patternKey: "factory:AsyncWebClient:*",
    matches: [
      "from slack_sdk.web.async_client import AsyncWebClient\n\nclient = AsyncWebClient(token=os.environ[\"SLACK_BOT_TOKEN\"])",
    ],
    rejects: [
      "def AsyncWebClient(*parts, **options):\n    return parts\n\nclient = AsyncWebClient(token=os.environ[\"SLACK_BOT_TOKEN\"])",
    ],
  },
  {
    library: PYTHON_SLACK_SDK,
    patternKey: "factory:AsyncWebClient:*>call:chat_postMessage:*",
    matches: [
      "from slack_sdk.web.async_client import AsyncWebClient\n\nclient = AsyncWebClient(token=os.environ[\"SLACK_BOT_TOKEN\"])\n\nasync def post_message():\n    await client.chat_postMessage(channel=\"#random\", text=\"Hello world!\")",
    ],
    rejects: [
      "client = LocalRegistry()\n\nasync def post_message():\n    await client.chat_postMessage(channel=\"#random\", text=\"Hello world!\")",
    ],
  },
  {
    library: PYTHON_SLACK_SDK,
    patternKey: "factory:AsyncWebClient:*>call:files_upload_v2:*",
    matches: [
      "from slack_sdk.web.async_client import AsyncWebClient\n\nclient = AsyncWebClient(token=os.environ[\"SLACK_BOT_TOKEN\"])\n\nasync def upload():\n    await client.files_upload_v2(channel=\"C0123456789\", file=filepath)",
    ],
    rejects: [
      "client = LocalRegistry()\n\nasync def upload():\n    await client.files_upload_v2(channel=\"C0123456789\", file=filepath)",
    ],
  },
]

const TWILIO_PYTHON = "twilio-python"

export const twilioFixtures: readonly PatternFixture[] = [
  {
    library: TWILIO_PYTHON,
    patternKey: "factory:Client:*",
    matches: [
      "from twilio.rest import Client\n\nclient = Client(account_sid, auth_token)",
    ],
    rejects: [
      "def Client(*parts, **options):\n    return parts\n\nclient = Client(account_sid, auth_token)",
    ],
  },
  {
    library: TWILIO_PYTHON,
    patternKey: "factory:Client:*>call:create:*",
    matches: [
      "from twilio.rest import Client\n\nclient = Client(account_sid, auth_token)\nmessage = client.messages.create(to=\"+15558675310\", body=\"Hey there!\", from_=\"+15017122661\")",
    ],
    rejects: [
      "client = LocalRegistry()\nmessage = client.messages.create(to=\"+15558675310\", body=\"Hey there!\", from_=\"+15017122661\")",
    ],
  },
  {
    library: TWILIO_PYTHON,
    patternKey: "factory:Client:*>call:create_async:*",
    matches: [
      "from twilio.rest import Client\n\nclient = Client(account_sid, auth_token)\n\nasync def send():\n    await client.messages.create_async(to=\"+15558675310\", body=\"Hey there!\")",
    ],
    rejects: [
      "client = LocalRegistry()\n\nasync def send():\n    await client.messages.create_async(to=\"+15558675310\", body=\"Hey there!\")",
    ],
  },
]
