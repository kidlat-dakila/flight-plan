import type { PatternFixture } from "@/catalogue/types"

const AUTHLIB = "Authlib"

export const authlibFixtures: readonly PatternFixture[] = [
  {
    library: AUTHLIB,
    patternKey: "factory:OAuth:*",
    matches: [
      "from authlib.integrations.flask_client import OAuth\n\noauth = OAuth(app)",
    ],
    rejects: [
      "def OAuth(*parts, **options):\n    return parts\n\noauth = OAuth(app)",
    ],
  },
  {
    library: AUTHLIB,
    patternKey: "factory:OAuth:*>call:register:*",
    matches: [
      "from authlib.integrations.flask_client import OAuth\n\noauth = OAuth(app)\n\noauth.register(name=\"google\", client_id=\"id\", client_secret=\"secret\")",
    ],
    rejects: [
      "oauth = LocalRegistry()\n\noauth.register(name=\"google\", client_id=\"id\", client_secret=\"secret\")",
    ],
  },
]

const DJANGO_ALLAUTH = "django-allauth"

export const djangoAllauthFixtures: readonly PatternFixture[] = [
  {
    library: DJANGO_ALLAUTH,
    patternKey: "file:**/allauth/urls.py:*",
    matches: [
      "allauth/urls.py",
      "venv/lib/allauth/urls.py",
    ],
    rejects: [
      "allauth/views.py",
      "accounts/urls.py",
    ],
  },
]

const DJANGO_GUARDIAN = "django-guardian"

export const djangoGuardianFixtures: readonly PatternFixture[] = [
  {
    library: DJANGO_GUARDIAN,
    patternKey: "call:assign_perm:*",
    matches: [
      "from guardian.shortcuts import assign_perm\n\nassign_perm(\"change_post\", jack, post)",
    ],
    rejects: [
      "def assign_perm(*parts, **options):\n    return parts\n\nassign_perm(\"change_post\", jack, post)",
    ],
  },
  {
    library: DJANGO_GUARDIAN,
    patternKey: "decorator:permission_required:*",
    matches: [
      "from guardian.decorators import permission_required\n\n@permission_required(\"auth.change_user\", (User, \"username\", \"username\"))\ndef edit_user(request, username):\n    return HttpResponse(\"ok\")",
    ],
    rejects: [
      "def permission_required(*parts, **options):\n    return parts\n\n@permission_required(\"auth.change_user\", (User, \"username\", \"username\"))\ndef edit_user(request, username):\n    return HttpResponse(\"ok\")",
    ],
  },
]

const DJANGO_OAUTH_TOOLKIT = "django-oauth-toolkit"

export const djangoOauthToolkitFixtures: readonly PatternFixture[] = [
  {
    library: DJANGO_OAUTH_TOOLKIT,
    patternKey: "decorator:protected_resource:*",
    matches: [
      "from oauth2_provider.decorators import protected_resource\n\n@protected_resource(scopes=[\"read\"])\ndef my_view(request):\n    return HttpResponse(\"ok\")",
    ],
    rejects: [
      "def protected_resource(*parts, **options):\n    return parts\n\n@protected_resource(scopes=[\"read\"])\ndef my_view(request):\n    return HttpResponse(\"ok\")",
    ],
  },
]

const OAUTHLIB = "OAuthLib"

export const oauthlibFixtures: readonly PatternFixture[] = [
  {
    library: OAUTHLIB,
    patternKey: "factory:WebApplicationClient:*",
    matches: [
      "from oauthlib.oauth2 import WebApplicationClient\n\nclient = WebApplicationClient(client_id)",
    ],
    rejects: [
      "def WebApplicationClient(*parts, **options):\n    return parts\n\nclient = WebApplicationClient(client_id)",
    ],
  },
]

const PYJWT = "PyJWT"

export const pyjwtFixtures: readonly PatternFixture[] = [
  {
    library: PYJWT,
    patternKey: "call:encode:*",
    matches: [
      "from jwt import encode\n\nencoded = encode({\"some\": \"payload\"}, \"secret\", algorithm=\"HS256\")",
    ],
    rejects: [
      "def encode(*parts, **options):\n    return parts\n\nencoded = encode({\"some\": \"payload\"}, \"secret\", algorithm=\"HS256\")",
    ],
  },
  {
    library: PYJWT,
    patternKey: "call:decode:*",
    matches: [
      "from jwt import decode\n\npayload = decode(encoded, \"secret\", algorithms=[\"HS256\"])",
    ],
    rejects: [
      "def decode(*parts, **options):\n    return parts\n\npayload = decode(encoded, \"secret\", algorithms=[\"HS256\"])",
    ],
  },
  {
    library: PYJWT,
    patternKey: "factory:PyJWKClient:*",
    matches: [
      "from jwt import PyJWKClient\n\njwks_client = PyJWKClient(url)",
    ],
    rejects: [
      "def PyJWKClient(*parts, **options):\n    return parts\n\njwks_client = PyJWKClient(url)",
    ],
  },
  {
    library: PYJWT,
    patternKey: "factory:PyJWKClient:*>call:get_signing_key_from_jwt:*",
    matches: [
      "from jwt import PyJWKClient\n\njwks_client = PyJWKClient(url)\n\nsigning_key = jwks_client.get_signing_key_from_jwt(token)",
    ],
    rejects: [
      "jwks_client = LocalRegistry()\n\nsigning_key = jwks_client.get_signing_key_from_jwt(token)",
    ],
  },
]

const PYTHON_JOSE = "python-jose"

export const pythonJoseFixtures: readonly PatternFixture[] = [
  {
    library: PYTHON_JOSE,
    patternKey: "call:jwt.encode:*",
    matches: [
      "from jose import jwt\n\ntoken = jwt.encode({\"key\": \"value\"}, \"secret\", algorithm=\"HS256\")",
    ],
    rejects: [
      "jwt = LocalRegistry()\n\ntoken = jwt.encode({\"key\": \"value\"}, \"secret\", algorithm=\"HS256\")",
    ],
  },
  {
    library: PYTHON_JOSE,
    patternKey: "call:jwt.decode:*",
    matches: [
      "from jose import jwt\n\nclaims = jwt.decode(token, \"secret\", algorithms=[\"HS256\"])",
    ],
    rejects: [
      "jwt = LocalRegistry()\n\nclaims = jwt.decode(token, \"secret\", algorithms=[\"HS256\"])",
    ],
  },
  {
    library: PYTHON_JOSE,
    patternKey: "call:jws.sign:*",
    matches: [
      "from jose import jws\n\nsigned = jws.sign({\"a\": \"b\"}, \"secret\", algorithm=\"HS256\")",
    ],
    rejects: [
      "jws = LocalRegistry()\n\nsigned = jws.sign({\"a\": \"b\"}, \"secret\", algorithm=\"HS256\")",
    ],
  },
  {
    library: PYTHON_JOSE,
    patternKey: "call:jws.verify:*",
    matches: [
      "from jose import jws\n\npayload = jws.verify(signed, \"secret\", algorithms=[\"HS256\"])",
    ],
    rejects: [
      "jws = LocalRegistry()\n\npayload = jws.verify(signed, \"secret\", algorithms=[\"HS256\"])",
    ],
  },
]

const PYTHON_JWT = "python-jwt"

export const pythonJwtFixtures: readonly PatternFixture[] = [
  {
    library: PYTHON_JWT,
    patternKey: "call:generate_jwt:*",
    matches: [
      "from python_jwt import generate_jwt\n\ntoken = generate_jwt(payload, key, \"PS256\", datetime.timedelta(minutes=5))",
    ],
    rejects: [
      "def generate_jwt(*parts, **options):\n    return parts\n\ntoken = generate_jwt(payload, key, \"PS256\", datetime.timedelta(minutes=5))",
    ],
  },
  {
    library: PYTHON_JWT,
    patternKey: "call:verify_jwt:*",
    matches: [
      "from python_jwt import verify_jwt\n\nheader, claims = verify_jwt(token, key, [\"PS256\"])",
    ],
    rejects: [
      "def verify_jwt(*parts, **options):\n    return parts\n\nheader, claims = verify_jwt(token, key, [\"PS256\"])",
    ],
  },
]

const PYTHON_OAUTH2 = "python-oauth2"

export const pythonOauth2Fixtures: readonly PatternFixture[] = [
  {
    library: PYTHON_OAUTH2,
    patternKey: "factory:Consumer:*",
    matches: [
      "from oauth2 import Consumer\n\nconsumer = Consumer(key=\"your-twitter-consumer-key\", secret=\"your-twitter-consumer-secret\")",
    ],
    rejects: [
      "def Consumer(*parts, **options):\n    return parts\n\nconsumer = Consumer(key=\"your-twitter-consumer-key\", secret=\"your-twitter-consumer-secret\")",
    ],
  },
  {
    library: PYTHON_OAUTH2,
    patternKey: "factory:Client:*",
    matches: [
      "from oauth2 import Client\n\nclient = Client(consumer)",
    ],
    rejects: [
      "def Client(*parts, **options):\n    return parts\n\nclient = Client(consumer)",
    ],
  },
  {
    library: PYTHON_OAUTH2,
    patternKey: "factory:Client:*>call:request:*",
    matches: [
      "from oauth2 import Client\n\nclient = Client(consumer)\n\nresp, content = client.request(request_token_url, \"GET\")",
    ],
    rejects: [
      "client = LocalRegistry()\n\nresp, content = client.request(request_token_url, \"GET\")",
    ],
  },
]

const PYTHON_SOCIAL_AUTH = "python-social-auth"

export const pythonSocialAuthFixtures: readonly PatternFixture[] = [
  {
    library: PYTHON_SOCIAL_AUTH,
    patternKey: "decorator:partial:*",
    matches: [
      "from social_core.pipeline.partial import partial\n\n@partial\ndef require_email(strategy, details, user=None, is_new=False, *args, **kwargs):\n    return None",
    ],
    rejects: [
      "def partial(*parts, **options):\n    return parts\n\n@partial\ndef require_email(strategy, details, user=None, is_new=False, *args, **kwargs):\n    return None",
    ],
  },
]
