import type { PatternFixture } from "@/catalogue/types"

const LOCAL_APP = "app = LocalRegistry()"

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
