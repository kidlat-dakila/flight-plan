import type { PatternFixture } from "@/catalogue/types"

const LOCAL_ROUTER = "router = LocalRegistry()"

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
