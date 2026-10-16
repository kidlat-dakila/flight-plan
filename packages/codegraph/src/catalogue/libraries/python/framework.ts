import type { CallPattern, CatalogueLibrary, MethodPattern } from "@/catalogue/types"

const EVERY_METHOD = "*"

const FIRST_ARGUMENT = 0

const SECOND_ARGUMENT = 1

const DJANGO_REST_FRAMEWORK_REGISTER: CallPattern = {
  kind: "call",
  name: "register",
  slots: [{ at: [1, "viewset"], runs: "route" }],
  pathAt: [0, "prefix"],
  method: EVERY_METHOD,
}

export const djangoRestFrameworkLibrary: CatalogueLibrary = {
  name: "Django REST framework",
  specifiers: ["rest_framework", "rest_framework.decorators", "rest_framework.routers"],
  documentedVersion: "3.18",
  category: "framework",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "factory", name: "DefaultRouter", methods: [DJANGO_REST_FRAMEWORK_REGISTER] },
    { kind: "factory", name: "SimpleRouter", methods: [DJANGO_REST_FRAMEWORK_REGISTER] },
    { kind: "decorator", name: "action", runs: "route", pathAt: "url_path", methodAt: "methods" },
    { kind: "decorator", name: "api_view", methodAt: "0[]" },
    { kind: "decorator", name: "permission_classes", makes: "auth" },
    { kind: "decorator", name: "authentication_classes", makes: "auth" },
  ],
}

export const djangoTastypieLibrary: CatalogueLibrary = {
  name: "django-tastypie",
  specifiers: ["tastypie", "tastypie.resources", "tastypie.api"],
  documentedVersion: "0.15",
  category: "framework",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "class",
      name: "ModelResource",
      makes: "data",
      members: [],
      methods: [],
    },
    {
      kind: "factory",
      name: "Api",
      prefixAt: "api_name",
      methods: [
        { kind: "call", name: "register", slots: [{ at: 0, runs: "route" }], pathAt: 0, method: "*" },
      ],
    },
  ],
}

export const eveLibrary: CatalogueLibrary = {
  name: "Eve",
  specifiers: ["eve"],
  documentedVersion: "2.3",
  category: "framework",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "Eve",
      methods: [
        { kind: "call", name: "run", slots: [], makes: "config" },
      ],
    },
  ],
}

export const flaskApiLibrary: CatalogueLibrary = {
  name: "Flask API",
  specifiers: ["flask_api"],
  documentedVersion: "3.1",
  category: "framework",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "FlaskAPI",
      methods: [
        { kind: "decorator", name: "route", runs: "route", pathAt: 0, methodAt: "methods" },
      ],
    },
  ],
}

export const flaskRestfulLibrary: CatalogueLibrary = {
  name: "Flask-RESTful",
  specifiers: ["flask_restful"],
  documentedVersion: "0.3",
  category: "framework",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "class",
      name: "Resource",
      members: [{ name: "get", runs: "route", method: "GET" }, { name: "put", runs: "route", method: "PUT" }, { name: "post", runs: "route", method: "POST" }, { name: "delete", runs: "route", method: "DELETE" }],
      methods: [],
    },
    {
      kind: "factory",
      name: "Api",
      methods: [
        { kind: "call", name: "add_resource", slots: [{ at: 0, runs: "route" }], pathAt: 1, method: "*" },
      ],
    },
  ],
}

export const masoniteLibrary: CatalogueLibrary = {
  name: "Masonite",
  specifiers: ["masonite", "masonite.routes", "masonite.mail"],
  documentedVersion: "4.20",
  category: "framework",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "call", name: "Route.get", slots: [], makes: "config", pathAt: 0, method: "GET" },
    { kind: "call", name: "Route.group", slots: [], prefixAt: "prefix" },
  ],
}

export const pyramidLibrary: CatalogueLibrary = {
  name: "Pyramid",
  specifiers: ["pyramid", "pyramid.config", "pyramid.view"],
  documentedVersion: "2.1",
  category: "framework",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "Configurator",
      methods: [
        { kind: "call", name: "add_route", slots: [], makes: "config", pathAt: [1, "pattern"], eventAt: [0, "name"] },
        { kind: "call", name: "add_view", slots: [{ at: [0, "view"], runs: "event" }], eventAt: "route_name" },
        { kind: "call", name: "scan", slots: [], makes: "config" },
      ],
    },
    { kind: "decorator", name: "view_config", runs: "event", methodAt: "request_method", eventAt: "route_name" },
  ],
}

export const tornadoLibrary: CatalogueLibrary = {
  name: "Tornado",
  specifiers: ["tornado", "tornado.web"],
  documentedVersion: "6.5",
  category: "framework",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "class",
      name: "RequestHandler",
      members: [{ name: "get", runs: "route", method: "GET" }, { name: "post", runs: "route", method: "POST" }, { name: "prepare", runs: "middleware" }, { name: "initialize", runs: "in-place" }],
      methods: [],
    },
    {
      kind: "factory",
      name: "Application",
      methods: [
        { kind: "call", name: "listen", slots: [], makes: "config" },
      ],
    },
  ],
}

export const falconLibrary: CatalogueLibrary = {
  name: "Falcon",
  specifiers: ["falcon", "falcon.asgi"],
  documentedVersion: "4.4",
  category: "framework",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "App",
      methods: [{ kind: "call", name: "add_route", slots: [{ at: SECOND_ARGUMENT, runs: "route" }], pathAt: FIRST_ARGUMENT, method: EVERY_METHOD }],
    },
  ],
}

const SANIC_METHODS: readonly MethodPattern[] = [
  { kind: "decorator", name: "route", runs: "route", pathAt: FIRST_ARGUMENT, method: EVERY_METHOD },
  { kind: "decorator", name: "get", runs: "route", pathAt: FIRST_ARGUMENT, method: "GET" },
  { kind: "decorator", name: "middleware", runs: "middleware" },
  { kind: "decorator", name: "on_request", runs: "middleware" },
  { kind: "decorator", name: "on_response", runs: "middleware" },
]

export const sanicLibrary: CatalogueLibrary = {
  name: "Sanic",
  specifiers: ["sanic"],
  documentedVersion: "25.12",
  category: "framework",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "factory", name: "Sanic", methods: SANIC_METHODS },
    { kind: "factory", name: "Blueprint", methods: SANIC_METHODS },
  ],
}
