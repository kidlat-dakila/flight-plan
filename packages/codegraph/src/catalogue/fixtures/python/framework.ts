import type { PatternFixture } from "@/catalogue/types"

const LOCAL_ROUTER = "router = LocalRegistry()"

const LOCAL_APP = "app = LocalRegistry()"

const DJANGO = "Django"

const djangoFixtureOf = (patternKey: string, matches: readonly string[], rejects: readonly string[]): PatternFixture => ({
  library: DJANGO,
  patternKey,
  matches,
  rejects,
})

const djangoImportedCall = (specifier: string, name: string, code: string): PatternFixture =>
  djangoFixtureOf(`call:${name}:*`, [`from ${specifier} import ${name}\n\n${code}`], [`def ${name}(*parts, **options):\n    return parts\n\n${code}`])

const djangoImportedDecorator = (specifier: string, name: string, decorator: string): PatternFixture =>
  djangoFixtureOf(
    `decorator:${name}:*`,
    [`from ${specifier} import ${name}\n\n@${decorator}\ndef my_view(request):\n    ...`],
    [`def ${name}(*parts):\n    return parts\n\n@${decorator}\ndef my_view(request):\n    ...`],
  )

const djangoCacheCall = (method: string, call: string): PatternFixture =>
  djangoFixtureOf(`call:cache.${method}:*`, [`from django.core.cache import cache\n\n${call}`], [`cache = {}\n\n${call}`])

export const djangoFixtures: readonly PatternFixture[] = [
  djangoFixtureOf(
    "call:path:*",
    [
      "from django.urls import path\n\nurlpatterns = [\n    path(\"bio/<username>/\", views.bio, name=\"bio\"),\n]",
      "from django.urls import include, path\n\nurlpatterns = [\n    path(\"blog/\", include(\"blog.urls\")),\n]",
    ],
    ["from pathlib import Path as path\n\nurlpatterns = [path(\"bio/\")]"],
  ),
  djangoFixtureOf(
    "call:re_path:*",
    ["from django.urls import re_path\n\nurlpatterns = [\n    re_path(r\"^bio/(?P<username>\\w+)/$\", views.bio, name=\"bio\"),\n]"],
    ["def re_path(route, view):\n    return route\n\nurlpatterns = [re_path(r\"^bio/$\", views.bio)]"],
  ),
  djangoFixtureOf(
    "file:**/management/commands/[!_]*.py:*",
    ["polls/management/commands/closepoll.py", "apps/billing/management/commands/send_invoices.py"],
    ["polls/management/commands/__init__.py", "polls/management/commands/_private.py", "polls/commands/closepoll.py"],
  ),
  djangoImportedCall("django.shortcuts", "redirect", "def my_view(request):\n    return redirect(\"/some/url/\")"),
  djangoImportedCall("django.shortcuts", "get_object_or_404", "def my_view(request):\n    obj = get_object_or_404(MyModel, pk=1)"),
  djangoImportedCall("django.shortcuts", "get_list_or_404", "def my_view(request):\n    my_objects = get_list_or_404(MyModel, published=True)"),
  djangoImportedCall("django.contrib.auth", "authenticate", "def my_view(request):\n    user = authenticate(request, username=username, password=password)"),
  djangoImportedCall("django.contrib.auth", "login", "def my_view(request):\n    login(request, user)"),
  djangoImportedCall("django.contrib.auth", "logout", "def logout_view(request):\n    logout(request)"),
  djangoImportedDecorator("django.contrib.auth.decorators", "login_required", "login_required"),
  djangoImportedDecorator("django.contrib.auth.decorators", "permission_required", "permission_required(\"polls.add_choice\")"),
  djangoImportedDecorator("django.contrib.auth.decorators", "user_passes_test", "user_passes_test(email_check)"),
  djangoImportedDecorator("django.views.decorators.cache", "cache_page", "cache_page(60 * 15)"),
  djangoCacheCall("get", "value = cache.get(\"my_key\")"),
  djangoCacheCall("set", "cache.set(\"my_key\", \"hello, world!\", 30)"),
  djangoCacheCall("get_or_set", "value = cache.get_or_set(\"my_new_key\", \"my new value\", 100)"),
  djangoCacheCall("delete", "cache.delete(\"a\")"),
  djangoFixtureOf(
    "decorator:transaction.atomic:*",
    ["from django.db import transaction\n\n@transaction.atomic\ndef viewfunc(request):\n    do_stuff()"],
    ["transaction = LocalLedger()\n\n@transaction.atomic\ndef viewfunc(request):\n    do_stuff()"],
  ),
  djangoFixtureOf(
    "call:transaction.atomic:*",
    ["from django.db import transaction\n\ndef viewfunc(request):\n    with transaction.atomic():\n        do_more_stuff()"],
    ["transaction = LocalLedger()\n\ndef viewfunc(request):\n    with transaction.atomic():\n        do_more_stuff()"],
  ),
  djangoImportedDecorator("django.dispatch", "receiver", "receiver(request_finished)"),
]

const DJANGO_REST_FRAMEWORK = "Django REST framework"

const DJANGO_REST_FRAMEWORK_REGISTRATION = "router.register(r\"users\", UserViewSet, basename=\"user\")"

const djangoRestFrameworkRouterFixtures = (name: string): PatternFixture[] => {
  const made = `from rest_framework.routers import ${name}\n\nrouter = ${name}()`
  return [
    {
      library: DJANGO_REST_FRAMEWORK,
      patternKey: `factory:${name}:*`,
      matches: [made, `from rest_framework import routers\n\nrouter = routers.${name}()`],
      rejects: [`def ${name}():\n    return LocalRegistry()\n\nrouter = ${name}()`],
    },
    {
      library: DJANGO_REST_FRAMEWORK,
      patternKey: `factory:${name}:*>call:register:*`,
      matches: [`${made}\n${DJANGO_REST_FRAMEWORK_REGISTRATION}`],
      rejects: [`${LOCAL_ROUTER}\n${DJANGO_REST_FRAMEWORK_REGISTRATION}`],
    },
  ]
}

const djangoRestFrameworkDecoratorFixture = (name: string, decorated: string): PatternFixture => ({
  library: DJANGO_REST_FRAMEWORK,
  patternKey: `decorator:${name}:*`,
  matches: [`from rest_framework.decorators import ${name}\n\n${decorated}`],
  rejects: [`def ${name}(*parts, **options):\n    return parts\n\n${decorated}`],
})

export const djangoRestFrameworkFixtures: readonly PatternFixture[] = [
  ...djangoRestFrameworkRouterFixtures("DefaultRouter"),
  ...djangoRestFrameworkRouterFixtures("SimpleRouter"),
  djangoRestFrameworkDecoratorFixture(
    "action",
    "class UserViewSet(viewsets.ModelViewSet):\n    @action(detail=True, methods=[\"post\"])\n    def set_password(self, request, pk=None):\n        ...",
  ),
  djangoRestFrameworkDecoratorFixture("permission_classes", "@permission_classes([IsAuthenticated])\ndef example_view(request, format=None):\n    ..."),
  djangoRestFrameworkDecoratorFixture("authentication_classes", "@authentication_classes([SessionAuthentication, BasicAuthentication])\ndef example_view(request, format=None):\n    ..."),
  {
    library: DJANGO_REST_FRAMEWORK,
    patternKey: "decorator:api_view:*",
    matches: [
      "from rest_framework.decorators import api_view\n\n@api_view([\"GET\", \"POST\"])\ndef hello_world(request):\n    ...",
      "from rest_framework.decorators import api_view\n\n@api_view()\ndef hello_world(request):\n    ...",
    ],
    rejects: [
      "def api_view(*parts):\n    return parts\n\n@api_view([\"GET\", \"POST\"])\ndef hello_world(request):\n    ...",
    ],
  },
]

const DJANGO_TASTYPIE = "django-tastypie"

export const djangoTastypieFixtures: readonly PatternFixture[] = [
  {
    library: DJANGO_TASTYPIE,
    patternKey: "class:ModelResource:*",
    matches: [
      "from tastypie.resources import ModelResource\n\nclass EntryResource(ModelResource):\n    class Meta:\n        queryset = Entry.objects.all()\n        resource_name = \"entry\"",
    ],
    rejects: [
      "class ModelResource:\n    pass\n\nclass EntryResource(ModelResource):\n    class Meta:\n        queryset = Entry.objects.all()\n        resource_name = \"entry\"",
    ],
  },
  {
    library: DJANGO_TASTYPIE,
    patternKey: "factory:Api:*",
    matches: [
      "from tastypie.api import Api\n\nv1_api = Api(api_name=\"v1\")",
    ],
    rejects: [
      "def Api(*parts, **options):\n    return parts\n\nv1_api = Api(api_name=\"v1\")",
    ],
  },
  {
    library: DJANGO_TASTYPIE,
    patternKey: "factory:Api:*>call:register:*",
    matches: [
      "from tastypie.api import Api\n\nv1_api = Api(api_name=\"v1\")\n\nv1_api.register(EntryResource())",
    ],
    rejects: [
      "v1_api = LocalRegistry()\n\nv1_api.register(EntryResource())",
    ],
  },
]

const EVE = "Eve"

export const eveFixtures: readonly PatternFixture[] = [
  {
    library: EVE,
    patternKey: "factory:Eve:*",
    matches: [
      "from eve import Eve\n\napp = Eve()",
    ],
    rejects: [
      "def Eve(*parts, **options):\n    return parts\n\napp = Eve()",
    ],
  },
  {
    library: EVE,
    patternKey: "factory:Eve:*>call:run:*",
    matches: [
      "from eve import Eve\n\napp = Eve()\n\napp.run()",
    ],
    rejects: [
      "app = LocalRegistry()\n\napp.run()",
    ],
  },
]

const FASTAPI = "FastAPI"

const FASTAPI_APP_KEY = "factory:FastAPI:*"

const FASTAPI_ROUTER_KEY = "factory:APIRouter:*"

const FASTAPI_APP = "from fastapi import FastAPI\n\napp = FastAPI()"

const FASTAPI_ROUTER = "from fastapi import APIRouter\n\nrouter = APIRouter()"

const FASTAPI_ROUTER_WITH_PREFIX = "from fastapi import APIRouter\n\nrouter = APIRouter(prefix=\"/items\", tags=[\"items\"])"

const FASTAPI_HTTP_OPERATIONS: readonly string[] = ["get", "post", "put", "patch", "delete", "options", "head", "trace"]

const fastapiDecorated = (decorator: string, handler: string): string => `@${decorator}\nasync def ${handler}:\n    ...`

const fastapiMethodFixture = (factoryKey: string, made: string, local: string, methodKey: string, codes: readonly string[]): PatternFixture => ({
  library: FASTAPI,
  patternKey: `${factoryKey}>${methodKey}`,
  matches: codes.map((code) => `${made}\n\n${code}`),
  rejects: codes.map((code) => `${local}\n\n${code}`),
})

const fastapiRouterMethodFixtures = (factoryKey: string, made: string, local: string, receiver: string): PatternFixture[] => [
  ...FASTAPI_HTTP_OPERATIONS.map((name) =>
    fastapiMethodFixture(factoryKey, made, local, `decorator:${name}:*`, [
      fastapiDecorated(`${receiver}.${name}("/items/{item_id}")`, "handle_item(item_id: int)"),
      fastapiDecorated(`${receiver}.${name}(path="/items/{item_id}")`, "handle_item(item_id: int)"),
    ]),
  ),
  fastapiMethodFixture(factoryKey, made, local, "decorator:api_route:*", [
    fastapiDecorated(`${receiver}.api_route("/items/{item_id}", methods=["GET", "POST"])`, "handle_item(item_id: int)"),
  ]),
  fastapiMethodFixture(factoryKey, made, local, "decorator:websocket:*", [
    fastapiDecorated(`${receiver}.websocket("/ws")`, "websocket_endpoint(websocket: WebSocket)"),
  ]),
  fastapiMethodFixture(factoryKey, made, local, "decorator:on_event:*", [fastapiDecorated(`${receiver}.on_event("startup")`, "open_pool()")]),
  fastapiMethodFixture(factoryKey, made, local, "call:add_api_route:*", [
    `${receiver}.add_api_route("/items/{item_id}", read_item, methods=["GET"])`,
    `${receiver}.add_api_route(path="/items/{item_id}", endpoint=read_item, methods=["GET"])`,
  ]),
  fastapiMethodFixture(factoryKey, made, local, "call:include_router:*", [
    `${receiver}.include_router(admin.router, prefix="/admin")`,
    `${receiver}.include_router(users.router)`,
  ]),
]

const fastapiCallFixture = (name: string, code: string): PatternFixture => ({
  library: FASTAPI,
  patternKey: `call:${name}:*`,
  matches: [`from fastapi import ${name}\n\n${code}`],
  rejects: [`def ${name}(*parts):\n    return parts\n\n${code}`],
})

export const fastapiFixtures: readonly PatternFixture[] = [
  { library: FASTAPI, patternKey: FASTAPI_APP_KEY, matches: [FASTAPI_APP], rejects: ["def FastAPI():\n    return LocalRegistry()\n\napp = FastAPI()"] },
  ...fastapiRouterMethodFixtures(FASTAPI_APP_KEY, FASTAPI_APP, LOCAL_APP, "app"),
  fastapiMethodFixture(FASTAPI_APP_KEY, FASTAPI_APP, LOCAL_APP, "decorator:middleware:*", [
    fastapiDecorated("app.middleware(\"http\")", "add_process_time_header(request: Request, call_next)"),
  ]),
  fastapiMethodFixture(FASTAPI_APP_KEY, FASTAPI_APP, LOCAL_APP, "decorator:exception_handler:*", [
    fastapiDecorated("app.exception_handler(UnicornException)", "unicorn_exception_handler(request: Request, exc: UnicornException)"),
  ]),
  {
    library: FASTAPI,
    patternKey: FASTAPI_ROUTER_KEY,
    matches: [FASTAPI_ROUTER, FASTAPI_ROUTER_WITH_PREFIX],
    rejects: ["def APIRouter(**options):\n    return LocalRegistry()\n\nrouter = APIRouter(prefix=\"/items\")"],
  },
  ...fastapiRouterMethodFixtures(FASTAPI_ROUTER_KEY, FASTAPI_ROUTER, LOCAL_ROUTER, "router"),
  fastapiCallFixture("Depends", "async def read_system_status(current_user: Annotated[User, Depends(get_current_user)]):\n    ..."),
  fastapiCallFixture("Security", "async def read_own_items(current_user: Annotated[User, Security(get_current_active_user, scopes=[\"items\"])]):\n    ..."),
]

const FLASK = "Flask"

const FLASK_APP_KEY = "factory:Flask:*"

const FLASK_BLUEPRINT_KEY = "factory:Blueprint:*"

const FLASK_APP = "from flask import Flask\n\napp = Flask(__name__)"

const FLASK_BLUEPRINT = "from flask import Blueprint\n\nbp = Blueprint(\"auth\", __name__, url_prefix=\"/auth\")"

const FLASK_LOCAL_BLUEPRINT = "bp = LocalRegistry()"

const FLASK_METHOD_ROUTES: readonly string[] = ["get", "post", "put", "delete", "patch"]

const FLASK_HOOKS: readonly string[] = ["before_request", "after_request", "teardown_request"]

const flaskDecorated = (decorator: string, handler: string): string => `@${decorator}\ndef ${handler}:\n    ...`

const flaskMethodFixture = (factoryKey: string, made: string, local: string, methodKey: string, codes: readonly string[]): PatternFixture => ({
  library: FLASK,
  patternKey: `${factoryKey}>${methodKey}`,
  matches: codes.map((code) => `${made}\n\n${code}`),
  rejects: codes.map((code) => `${local}\n\n${code}`),
})

const flaskScaffoldFixtures = (factoryKey: string, made: string, local: string, receiver: string): PatternFixture[] => [
  flaskMethodFixture(factoryKey, made, local, "decorator:route:*", [
    flaskDecorated(`${receiver}.route("/login", methods=["GET", "POST"])`, "login()"),
    flaskDecorated(`${receiver}.route("/")`, "index()"),
  ]),
  ...FLASK_METHOD_ROUTES.map((name) => flaskMethodFixture(factoryKey, made, local, `decorator:${name}:*`, [flaskDecorated(`${receiver}.${name}("/login")`, "handle_login()")])),
  flaskMethodFixture(factoryKey, made, local, "call:add_url_rule:*", [
    `${receiver}.add_url_rule("/", view_func=index)`,
    `${receiver}.add_url_rule("/", "index", index, methods=["GET"])`,
  ]),
  ...FLASK_HOOKS.map((name) => flaskMethodFixture(factoryKey, made, local, `decorator:${name}:*`, [flaskDecorated(`${receiver}.${name}`, "handle_request(value=None)")])),
  flaskMethodFixture(factoryKey, made, local, "decorator:errorhandler:*", [flaskDecorated(`${receiver}.errorhandler(404)`, "page_not_found(e)")]),
  flaskMethodFixture(factoryKey, made, local, "decorator:command:*", [flaskDecorated(`${receiver}.cli.command("create-user")`, "create_user(name)")]),
  flaskMethodFixture(factoryKey, made, local, "call:register_blueprint:*", [
    `${receiver}.register_blueprint(admin, url_prefix="/admin")`,
    `${receiver}.register_blueprint(auth.bp)`,
  ]),
]

export const flaskFixtures: readonly PatternFixture[] = [
  { library: FLASK, patternKey: FLASK_APP_KEY, matches: [FLASK_APP], rejects: ["def Flask(name):\n    return LocalRegistry()\n\napp = Flask(__name__)"] },
  ...flaskScaffoldFixtures(FLASK_APP_KEY, FLASK_APP, LOCAL_APP, "app"),
  {
    library: FLASK,
    patternKey: FLASK_BLUEPRINT_KEY,
    matches: [FLASK_BLUEPRINT, "from flask import Blueprint\n\nsimple_page = Blueprint(\"simple_page\", __name__)"],
    rejects: ["def Blueprint(*parts, **options):\n    return LocalRegistry()\n\nbp = Blueprint(\"auth\", __name__)"],
  },
  ...flaskScaffoldFixtures(FLASK_BLUEPRINT_KEY, FLASK_BLUEPRINT, FLASK_LOCAL_BLUEPRINT, "bp"),
  flaskMethodFixture(FLASK_BLUEPRINT_KEY, FLASK_BLUEPRINT, FLASK_LOCAL_BLUEPRINT, "decorator:before_app_request:*", [flaskDecorated("bp.before_app_request", "load_logged_in_user()")]),
  flaskMethodFixture(FLASK_BLUEPRINT_KEY, FLASK_BLUEPRINT, FLASK_LOCAL_BLUEPRINT, "decorator:after_app_request:*", [flaskDecorated("bp.after_app_request", "add_headers(response)")]),
  flaskMethodFixture(FLASK_BLUEPRINT_KEY, FLASK_BLUEPRINT, FLASK_LOCAL_BLUEPRINT, "decorator:app_errorhandler:*", [flaskDecorated("bp.app_errorhandler(404)", "page_not_found(e)")]),
  {
    library: FLASK,
    patternKey: "call:redirect:*",
    matches: ["from flask import redirect, url_for\n\ndef index():\n    return redirect(url_for(\"login\"))"],
    rejects: ["def redirect(location):\n    return location\n\ndef index():\n    return redirect(\"/login\")"],
  },
]

const FLASK_API = "Flask API"

export const flaskApiFixtures: readonly PatternFixture[] = [
  {
    library: FLASK_API,
    patternKey: "factory:FlaskAPI:*",
    matches: [
      "from flask_api import FlaskAPI\n\napp = FlaskAPI(__name__)",
    ],
    rejects: [
      "def FlaskAPI(*parts, **options):\n    return parts\n\napp = FlaskAPI(__name__)",
    ],
  },
  {
    library: FLASK_API,
    patternKey: "factory:FlaskAPI:*>decorator:route:*",
    matches: [
      "from flask_api import FlaskAPI\n\napp = FlaskAPI(__name__)\n\n@app.route(\"/example/\", methods=[\"GET\", \"POST\"])\ndef example():\n    return {\"hello\": \"world\"}",
    ],
    rejects: [
      "app = LocalRegistry()\n\n@app.route(\"/example/\", methods=[\"GET\", \"POST\"])\ndef example():\n    return {\"hello\": \"world\"}",
    ],
  },
]

const FLASK_RESTFUL = "Flask-RESTful"

export const flaskRestfulFixtures: readonly PatternFixture[] = [
  {
    library: FLASK_RESTFUL,
    patternKey: "class:Resource:*",
    matches: [
      "from flask_restful import Resource\n\nclass HelloWorld(Resource):\n    def get(self):\n        return {\"hello\": \"world\"}",
    ],
    rejects: [
      "class Resource:\n    pass\n\nclass HelloWorld(Resource):\n    def get(self):\n        return {\"hello\": \"world\"}",
    ],
  },
  {
    library: FLASK_RESTFUL,
    patternKey: "factory:Api:*",
    matches: [
      "from flask_restful import Api\n\napi = Api(app)",
    ],
    rejects: [
      "def Api(*parts, **options):\n    return parts\n\napi = Api(app)",
    ],
  },
  {
    library: FLASK_RESTFUL,
    patternKey: "factory:Api:*>call:add_resource:*",
    matches: [
      "from flask_restful import Api\n\napi = Api(app)\n\napi.add_resource(HelloWorld, \"/\", \"/hello\")",
    ],
    rejects: [
      "api = LocalRegistry()\n\napi.add_resource(HelloWorld, \"/\", \"/hello\")",
    ],
  },
]

const MASONITE = "Masonite"

export const masoniteFixtures: readonly PatternFixture[] = [
  {
    library: MASONITE,
    patternKey: "call:Route.get:*",
    matches: [
      "from masonite.routes import Route\n\nROUTES = [Route.get(\"/dashboard\", \"DashboardController@show\")]",
    ],
    rejects: [
      "Route = LocalRegistry()\n\nROUTES = [Route.get(\"/dashboard\", \"DashboardController@show\")]",
    ],
  },
  {
    library: MASONITE,
    patternKey: "call:Route.group:*",
    matches: [
      "from masonite.routes import Route\n\nROUTES = [Route.group([Route.get(\"/settings\", \"DashboardController@settings\")], prefix=\"/dashboard\")]",
    ],
    rejects: [
      "Route = LocalRegistry()\n\nROUTES = [Route.group([Route.get(\"/settings\", \"DashboardController@settings\")], prefix=\"/dashboard\")]",
    ],
  },
]

const PYRAMID = "Pyramid"

export const pyramidFixtures: readonly PatternFixture[] = [
  {
    library: PYRAMID,
    patternKey: "factory:Configurator:*",
    matches: [
      "from pyramid.config import Configurator\n\nconfig = Configurator()",
    ],
    rejects: [
      "def Configurator(*parts, **options):\n    return parts\n\nconfig = Configurator()",
    ],
  },
  {
    library: PYRAMID,
    patternKey: "factory:Configurator:*>call:add_route:*",
    matches: [
      "from pyramid.config import Configurator\n\nconfig = Configurator()\n\nconfig.add_route(\"hello\", \"/hello/{name}\")",
    ],
    rejects: [
      "config = LocalRegistry()\n\nconfig.add_route(\"hello\", \"/hello/{name}\")",
    ],
  },
  {
    library: PYRAMID,
    patternKey: "factory:Configurator:*>call:add_view:*",
    matches: [
      "from pyramid.config import Configurator\n\nconfig = Configurator()\n\nconfig.add_view(hello_world, route_name=\"hello\")",
    ],
    rejects: [
      "config = LocalRegistry()\n\nconfig.add_view(hello_world, route_name=\"hello\")",
    ],
  },
  {
    library: PYRAMID,
    patternKey: "factory:Configurator:*>call:scan:*",
    matches: [
      "from pyramid.config import Configurator\n\nconfig = Configurator()\n\nconfig.scan()",
    ],
    rejects: [
      "config = LocalRegistry()\n\nconfig.scan()",
    ],
  },
  {
    library: PYRAMID,
    patternKey: "decorator:view_config:*",
    matches: [
      "from pyramid.view import view_config\n\n@view_config(route_name=\"hello\", renderer=\"json\")\ndef my_view(request):\n    return {\"ok\": True}",
    ],
    rejects: [
      "def view_config(*parts, **options):\n    return parts\n\n@view_config(route_name=\"hello\", renderer=\"json\")\ndef my_view(request):\n    return {\"ok\": True}",
    ],
  },
]

const TORNADO = "Tornado"

export const tornadoFixtures: readonly PatternFixture[] = [
  {
    library: TORNADO,
    patternKey: "class:RequestHandler:*",
    matches: [
      "from tornado.web import RequestHandler\n\nclass MainHandler(RequestHandler):\n    def get(self):\n        self.write(\"Hello, world\")",
    ],
    rejects: [
      "class RequestHandler:\n    pass\n\nclass MainHandler(RequestHandler):\n    def get(self):\n        self.write(\"Hello, world\")",
    ],
  },
  {
    library: TORNADO,
    patternKey: "factory:Application:*",
    matches: [
      "from tornado.web import Application\n\napp = Application([(r\"/\", MainHandler)])",
    ],
    rejects: [
      "def Application(*parts, **options):\n    return parts\n\napp = Application([(r\"/\", MainHandler)])",
    ],
  },
  {
    library: TORNADO,
    patternKey: "factory:Application:*>call:listen:*",
    matches: [
      "from tornado.web import Application\n\napp = Application([(r\"/\", MainHandler)])\n\napp.listen(8888)",
    ],
    rejects: [
      "app = LocalRegistry()\n\napp.listen(8888)",
    ],
  },
]

const FALCON = "Falcon"

export const falconFixtures: readonly PatternFixture[] = [
  {
    library: FALCON,
    patternKey: "factory:App:*",
    matches: [
      "import falcon\n\napp = falcon.App()",
      "import falcon\nimport falcon.asgi\n\napp = falcon.asgi.App()",
    ],
    rejects: [
      "app = LocalRegistry()",
    ],
  },
  {
    library: FALCON,
    patternKey: "factory:App:*>call:add_route:*",
    matches: [
      "import falcon\n\napp = falcon.App()\nimages = ImagesResource()\napp.add_route(\"/images\", images)",
    ],
    rejects: [
      "app = LocalRegistry()\n\napp.add_route(\"/images\", images)",
    ],
  },
]

const SANIC = "Sanic"

export const sanicFixtures: readonly PatternFixture[] = [
  {
    library: SANIC,
    patternKey: "factory:Sanic:*",
    matches: [
      "from sanic import Sanic\n\napp = Sanic(\"MyHelloWorldApp\")",
    ],
    rejects: [
      "app = LocalRegistry()",
    ],
  },
  {
    library: SANIC,
    patternKey: "factory:Sanic:*>decorator:route:*",
    matches: [
      "from sanic import Sanic\n\napp = Sanic(\"MyHelloWorldApp\")\n\n@app.route(\"/stairway\")\nasync def stairway(request):\n    ...",
    ],
    rejects: [
      "app = LocalRegistry()\n\n@app.route(\"/stairway\")\nasync def stairway(request):\n    ...",
    ],
  },
  {
    library: SANIC,
    patternKey: "factory:Sanic:*>decorator:get:*",
    matches: [
      "from sanic import Sanic\n\napp = Sanic(\"MyHelloWorldApp\")\n\n@app.get(\"/to\")\nasync def to(request):\n    ...",
    ],
    rejects: [
      "app = LocalRegistry()\n\n@app.get(\"/to\")\nasync def to(request):\n    ...",
    ],
  },
  {
    library: SANIC,
    patternKey: "factory:Sanic:*>decorator:middleware:*",
    matches: [
      "from sanic import Sanic\n\napp = Sanic(\"MyHelloWorldApp\")\n\n@app.middleware(\"request\")\nasync def extract_user(request):\n    ...",
    ],
    rejects: [
      "app = LocalRegistry()\n\n@app.middleware(\"request\")\nasync def extract_user(request):\n    ...",
    ],
  },
  {
    library: SANIC,
    patternKey: "factory:Sanic:*>decorator:on_request:*",
    matches: [
      "from sanic import Sanic\n\napp = Sanic(\"MyHelloWorldApp\")\n\n@app.on_request\nasync def extract_user(request):\n    ...",
    ],
    rejects: [
      "app = LocalRegistry()\n\n@app.on_request\nasync def extract_user(request):\n    ...",
    ],
  },
  {
    library: SANIC,
    patternKey: "factory:Sanic:*>decorator:on_response:*",
    matches: [
      "from sanic import Sanic\n\napp = Sanic(\"MyHelloWorldApp\")\n\n@app.on_response\nasync def prevent_xss(request, response):\n    ...",
    ],
    rejects: [
      "app = LocalRegistry()\n\n@app.on_response\nasync def prevent_xss(request, response):\n    ...",
    ],
  },
  {
    library: SANIC,
    patternKey: "factory:Blueprint:*",
    matches: [
      "from sanic import Blueprint\n\nbp = Blueprint(\"my_blueprint\")",
    ],
    rejects: [
      "bp = LocalRegistry()",
    ],
  },
  {
    library: SANIC,
    patternKey: "factory:Blueprint:*>decorator:route:*",
    matches: [
      "from sanic import Blueprint\n\nbp = Blueprint(\"my_blueprint\")\n\n@bp.route(\"/stairway\")\nasync def stairway(request):\n    ...",
    ],
    rejects: [
      "bp = LocalRegistry()\n\n@bp.route(\"/stairway\")\nasync def stairway(request):\n    ...",
    ],
  },
  {
    library: SANIC,
    patternKey: "factory:Blueprint:*>decorator:get:*",
    matches: [
      "from sanic import Blueprint\n\nbp = Blueprint(\"my_blueprint\")\n\n@bp.get(\"/to\")\nasync def to(request):\n    ...",
    ],
    rejects: [
      "bp = LocalRegistry()\n\n@bp.get(\"/to\")\nasync def to(request):\n    ...",
    ],
  },
  {
    library: SANIC,
    patternKey: "factory:Blueprint:*>decorator:middleware:*",
    matches: [
      "from sanic import Blueprint\n\nbp = Blueprint(\"my_blueprint\")\n\n@bp.middleware(\"request\")\nasync def extract_user(request):\n    ...",
    ],
    rejects: [
      "bp = LocalRegistry()\n\n@bp.middleware(\"request\")\nasync def extract_user(request):\n    ...",
    ],
  },
  {
    library: SANIC,
    patternKey: "factory:Blueprint:*>decorator:on_request:*",
    matches: [
      "from sanic import Blueprint\n\nbp = Blueprint(\"my_blueprint\")\n\n@bp.on_request\nasync def extract_user(request):\n    ...",
    ],
    rejects: [
      "bp = LocalRegistry()\n\n@bp.on_request\nasync def extract_user(request):\n    ...",
    ],
  },
  {
    library: SANIC,
    patternKey: "factory:Blueprint:*>decorator:on_response:*",
    matches: [
      "from sanic import Blueprint\n\nbp = Blueprint(\"my_blueprint\")\n\n@bp.on_response\nasync def prevent_xss(request, response):\n    ...",
    ],
    rejects: [
      "bp = LocalRegistry()\n\n@bp.on_response\nasync def prevent_xss(request, response):\n    ...",
    ],
  },
]
