import type { PatternFixture } from "@/catalogue/types"

const DISCORD_INTERACTIONS_FOR_PYTHON = "discord-interactions for Python"

export const discordInteractionsForPythonFixtures: readonly PatternFixture[] = [
  {
    library: DISCORD_INTERACTIONS_FOR_PYTHON,
    patternKey: "call:verify_key:*",
    matches: [
      "from discord_interactions import verify_key\n\nis_valid = verify_key(request.data, signature, timestamp, CLIENT_PUBLIC_KEY)",
    ],
    rejects: [
      "def verify_key(*parts, **options):\n    return parts\n\nis_valid = verify_key(request.data, signature, timestamp, CLIENT_PUBLIC_KEY)",
    ],
  },
  {
    library: DISCORD_INTERACTIONS_FOR_PYTHON,
    patternKey: "decorator:verify_key_decorator:*",
    matches: [
      "from discord_interactions import verify_key_decorator\n\n@app.route(\"/interactions\", methods=[\"POST\"])\n@verify_key_decorator(CLIENT_PUBLIC_KEY)\ndef interactions():\n    return jsonify(reply(request.json))",
    ],
    rejects: [
      "def verify_key_decorator(*parts, **options):\n    return lambda view: view\n\n@app.route(\"/interactions\", methods=[\"POST\"])\n@verify_key_decorator(CLIENT_PUBLIC_KEY)\ndef interactions():\n    return jsonify(reply(request.json))",
    ],
  },
]

const GIDGETHUB = "gidgethub"

export const gidgethubFixtures: readonly PatternFixture[] = [
  {
    library: GIDGETHUB,
    patternKey: "call:Event.from_http:*",
    matches: [
      "from gidgethub import sansio\n\nasync def main(request):\n    body = await request.read()\n    event = sansio.Event.from_http(request.headers, body, secret=secret)",
      "from gidgethub.sansio import Event\n\nasync def main(request):\n    body = await request.read()\n    event = Event.from_http(request.headers, body, secret=secret)",
    ],
    rejects: [
      "sansio = LocalRegistry()\n\nasync def main(request):\n    body = await request.read()\n    event = sansio.Event.from_http(request.headers, body, secret=secret)",
    ],
  },
  {
    library: GIDGETHUB,
    patternKey: "call:validate_event:*",
    matches: [
      "from gidgethub.sansio import validate_event\n\nvalidate_event(body, signature=signature, secret=secret)",
    ],
    rejects: [
      "def validate_event(*parts, **options):\n    return parts\n\nvalidate_event(body, signature=signature, secret=secret)",
    ],
  },
  {
    library: GIDGETHUB,
    patternKey: "factory:Router:*",
    matches: [
      "from gidgethub import routing\n\nrouter = routing.Router()",
    ],
    rejects: [
      "routing = LocalRegistry()\n\nrouter = routing.Router()",
    ],
  },
  {
    library: GIDGETHUB,
    patternKey: "factory:Router:*>decorator:register:*",
    matches: [
      "from gidgethub import routing\n\nrouter = routing.Router()\n\n@router.register(\"issues\", action=\"opened\")\nasync def issue_opened_event(event, gh, *args, **kwargs):\n    await gh.post(event.data[\"issue\"][\"comments_url\"], data={\"body\": \"Thanks\"})",
    ],
    rejects: [
      "router = LocalRegistry()\n\n@router.register(\"issues\", action=\"opened\")\nasync def issue_opened_event(event, gh, *args, **kwargs):\n    await gh.post(event.data[\"issue\"][\"comments_url\"], data={\"body\": \"Thanks\"})",
    ],
  },
  {
    library: GIDGETHUB,
    patternKey: "factory:Router:*>call:add:*",
    matches: [
      "from gidgethub.routing import Router\n\nrouter = Router()\nrouter.add(issue_opened_event, \"issues\", action=\"opened\")",
    ],
    rejects: [
      "router = LocalRegistry()\nrouter.add(issue_opened_event, \"issues\", action=\"opened\")",
    ],
  },
]

const SLACKEVENTSAPI = "slackeventsapi"

export const slackeventsapiFixtures: readonly PatternFixture[] = [
  {
    library: SLACKEVENTSAPI,
    patternKey: "factory:SlackEventAdapter:*",
    matches: [
      "from slackeventsapi import SlackEventAdapter\n\nslack_events_adapter = SlackEventAdapter(SLACK_SIGNING_SECRET, \"/slack/events\", app)",
    ],
    rejects: [
      "def SlackEventAdapter(*parts, **options):\n    return parts\n\nslack_events_adapter = SlackEventAdapter(SLACK_SIGNING_SECRET, \"/slack/events\", app)",
    ],
  },
  {
    library: SLACKEVENTSAPI,
    patternKey: "factory:SlackEventAdapter:*>decorator:on:*",
    matches: [
      "from slackeventsapi import SlackEventAdapter\n\nslack_events_adapter = SlackEventAdapter(SLACK_SIGNING_SECRET, endpoint=\"/slack/events\")\n\n@slack_events_adapter.on(\"reaction_added\")\ndef reaction_added(event_data):\n    record(event_data[\"event\"][\"reaction\"])",
    ],
    rejects: [
      "slack_events_adapter = LocalRegistry()\n\n@slack_events_adapter.on(\"reaction_added\")\ndef reaction_added(event_data):\n    record(event_data[\"event\"][\"reaction\"])",
    ],
  },
]

const STANDARD_WEBHOOKS_FOR_PYTHON = "Standard Webhooks for Python"

export const standardWebhooksForPythonFixtures: readonly PatternFixture[] = [
  {
    library: STANDARD_WEBHOOKS_FOR_PYTHON,
    patternKey: "factory:Webhook:*",
    matches: [
      "from standardwebhooks import Webhook\n\nwh = Webhook(base64_secret)",
    ],
    rejects: [
      "def Webhook(*parts, **options):\n    return parts\n\nwh = Webhook(base64_secret)",
    ],
  },
  {
    library: STANDARD_WEBHOOKS_FOR_PYTHON,
    patternKey: "factory:Webhook:*>call:verify:*",
    matches: [
      "from standardwebhooks import Webhook\n\nwh = Webhook(base64_secret)\npayload = wh.verify(raw_body, request.headers)",
    ],
    rejects: [
      "wh = LocalRegistry()\npayload = wh.verify(raw_body, request.headers)",
    ],
  },
]

const SVIX_FOR_PYTHON = "Svix for Python"

export const svixForPythonFixtures: readonly PatternFixture[] = [
  {
    library: SVIX_FOR_PYTHON,
    patternKey: "factory:Webhook:*",
    matches: [
      "from svix.webhooks import Webhook\n\nwh = Webhook(secret)",
    ],
    rejects: [
      "def Webhook(*parts, **options):\n    return parts\n\nwh = Webhook(secret)",
    ],
  },
  {
    library: SVIX_FOR_PYTHON,
    patternKey: "factory:Webhook:*>call:verify:*",
    matches: [
      "from svix.webhooks import Webhook\n\nwh = Webhook(secret)\npayload = wh.verify(request.body, request.headers)",
    ],
    rejects: [
      "wh = LocalRegistry()\npayload = wh.verify(request.body, request.headers)",
    ],
  },
  {
    library: SVIX_FOR_PYTHON,
    patternKey: "factory:Svix:*",
    matches: [
      "from svix.api import Svix\n\nsvix = Svix(\"AUTH_TOKEN\")",
    ],
    rejects: [
      "def Svix(*parts, **options):\n    return parts\n\nsvix = Svix(\"AUTH_TOKEN\")",
    ],
  },
  {
    library: SVIX_FOR_PYTHON,
    patternKey: "factory:Svix:*>call:message.create:*",
    matches: [
      "from svix.api import Svix, MessageIn\n\nsvix = Svix(\"AUTH_TOKEN\")\nsvix.message.create(app_id, MessageIn(event_type=\"invoice.paid\", payload={\"id\": invoice_id}))",
    ],
    rejects: [
      "svix = LocalRegistry()\nsvix.message.create(app_id, MessageIn(event_type=\"invoice.paid\", payload={\"id\": invoice_id}))",
    ],
  },
  {
    library: SVIX_FOR_PYTHON,
    patternKey: "factory:SvixAsync:*",
    matches: [
      "from svix.api import SvixAsync\n\nsvix = SvixAsync(\"AUTH_TOKEN\")",
    ],
    rejects: [
      "def SvixAsync(*parts, **options):\n    return parts\n\nsvix = SvixAsync(\"AUTH_TOKEN\")",
    ],
  },
  {
    library: SVIX_FOR_PYTHON,
    patternKey: "factory:SvixAsync:*>call:message.create:*",
    matches: [
      "from svix.api import SvixAsync, MessageIn\n\nsvix = SvixAsync(\"AUTH_TOKEN\")\n\nasync def notify(app_id, invoice_id):\n    await svix.message.create(app_id, MessageIn(event_type=\"invoice.paid\", payload={\"id\": invoice_id}))",
    ],
    rejects: [
      "svix = LocalRegistry()\n\nasync def notify(app_id, invoice_id):\n    await svix.message.create(app_id, MessageIn(event_type=\"invoice.paid\", payload={\"id\": invoice_id}))",
    ],
  },
]
