import type { PatternFixture } from "@/catalogue/types"

const LOCAL_ROUTER = "router = LocalRegistry()"

const LOCAL_APP = "app = LocalRegistry()"

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
      fastapiDecorated(`${receiver}.${name}("/items/{item_id}", dependencies=[Depends(verify_key)])`, "handle_item(item_id: int)"),
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
    `${receiver}.include_router(users.router, prefix="/users", dependencies=[Depends(verify_key)])`,
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
  fastapiMethodFixture(FASTAPI_APP_KEY, FASTAPI_APP, LOCAL_APP, "call:mount:*", [
    "app.mount(\"/admin\", admin_app)",
    "app.mount(path=\"/admin\", app=admin_app)",
    "app.mount(\"/static\", StaticFiles(directory=\"static\"), name=\"static\")",
  ]),
  fastapiMethodFixture(FASTAPI_APP_KEY, FASTAPI_APP, LOCAL_APP, "call:add_middleware:*", [
    "app.add_middleware(TimingMiddleware)",
    "app.add_middleware(CORSMiddleware, allow_origins=[\"*\"])",
    "app.add_middleware(middleware_class=TimingMiddleware)",
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
