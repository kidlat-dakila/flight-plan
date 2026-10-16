import { BUILT_IN_LIBRARIES } from "@/catalogue/libraries"
import { fitsGlob } from "@/catalogue/matching/file-patterns"
import { matchFilePath, matchSource } from "@/catalogue/matching/match-source"
import type { CatalogueLibrary, LibraryLanguage } from "@/catalogue/types"
import { LIBRARIES } from "@/code-blocks/libraries"

const library = (name: string, specifiers: readonly string[], language: LibraryLanguage, patterns: CatalogueLibrary["patterns"]): CatalogueLibrary => ({
  name,
  specifiers,
  documentedVersion: "1",
  category: "framework",
  type: "backend",
  language,
  patterns,
})

const SERVER = library("Server", ["server"], "javascript", [
  {
    kind: "factory",
    name: "default",
    methods: [
      { kind: "call", name: "post", slots: [{ at: "last", runs: "route" }, { at: "rest", runs: "middleware" }], pathAt: 0, method: "POST" },
      { kind: "call", name: "transaction", slots: [{ at: 0, runs: "in-place" }], makes: "transaction" },
      { kind: "call", name: "find*", slots: [], makes: "data-fetch" },
      { kind: "factory", name: "route", prefixAt: 0, methods: [{ kind: "call", name: "get", slots: [{ at: "last", runs: "route" }], method: "GET" }] },
      { kind: "decorator", name: "task", runs: "job" },
    ],
    called: { slots: [], makes: "data" },
  },
  { kind: "call", name: "useLoad", slots: [{ at: "load", runs: "effect" }, { at: "pages[].load", runs: "effect" }], eventAt: "1.name" },
  { kind: "call", name: "program.run", slots: [], makes: "config" },
  { kind: "call", name: "plugin", slots: [{ at: "0.resolvers.*.*", runs: "resolver" }] },
  { kind: "decorator", name: "Get", runs: "route", pathAt: 0, method: "GET" },
  { kind: "element", name: "Link", slots: [], pathAt: "href", makes: "navigation" },
  { kind: "class", name: "Model", members: [{ name: "get", runs: "route", method: "GET" }], methods: [{ kind: "call", name: "all", slots: [], makes: "data-fetch" }] },
  { kind: "file", glob: "{app,src/app}/**/page.{ts,tsx}", exports: [{ name: "default", runs: "page" }] },
  { kind: "directive", text: "use server", runs: "route" },
])

const DJANGO = library("Web", ["web.cache", "web"], "python", [
  { kind: "call", name: "cache.get", slots: [], makes: "cache" },
  { kind: "factory", name: "App", methods: [{ kind: "decorator", name: "get", runs: "route", pathAt: [0, "path"], method: "GET" }] },
  { kind: "class", name: "Model", members: [], methods: [{ kind: "call", name: "filter", slots: [], makes: "data-fetch" }] },
])

const keysIn = (text: string, language: LibraryLanguage = "javascript"): string[] =>
  matchSource({ filePath: null, language, text }, [SERVER, DJANGO]).map((match) => match.patternKey)

const lines = (...written: readonly string[]): string => written.join("\n")

describe("a name is matched through its import", () => {
  it("matches a call of the export, under any local name", () => {
    expect(keysIn(lines("import { useLoad as load } from \"server\"", "load({})"))).toStrictEqual(["call:useLoad:*"])
  })

  it("matches a member of the whole library and of its default export", () => {
    expect(keysIn(lines("import * as server from \"server\"", "import whole from \"server\"", "server.useLoad({})", "whole.useLoad({})"))).toStrictEqual([
      "call:useLoad:*",
      "call:useLoad:*",
    ])
  })

  it("matches no function the file declares itself, and no name it does not import", () => {
    expect(keysIn(lines("const useLoad = () => 1", "useLoad({})", "post(\"/users\")"))).toStrictEqual([])
  })

  it("matches only a library of the language of the file", () => {
    expect(keysIn(lines("from server import useLoad", "", "useLoad()"), "python")).toStrictEqual([])
  })
})

describe("a value a factory made", () => {
  it("matches the factory, called or made with new", () => {
    expect(keysIn(lines("import server from \"server\"", "const app = server()", "const other = new server()"))).toStrictEqual(["factory:default:*", "factory:default:*"])
  })

  it("matches a method at any depth below the value, by a name that may hold a wildcard", () => {
    expect(keysIn(lines("import server from \"server\"", "const app = server()", "app.users.findMany()")).slice(1)).toStrictEqual([
      "factory:default:*>call:find*:*",
    ])
  })

  it("follows the value through a name taken apart from it, a subscript and a call it does not know", () => {
    const text = lines("import server from \"server\"", "const { tables } = server()", "tables[\"users\"].where(1).findOne()")

    expect(keysIn(text).slice(1)).toStrictEqual(["factory:default:*>call:find*:*"])
  })

  it("matches a method of a method that is a factory, and the value itself when it is called or used as a tag", () => {
    const text = lines("import server from \"server\"", "const app = server()", "app.route(\"/users\").get(list)", "app(1)", "app`select 1`")

    expect(keysIn(text).slice(1)).toStrictEqual([
      "factory:default:*>factory:route:*>call:get:*",
      "factory:default:*>factory:route:*",
      "factory:default:*>called",
      "factory:default:*>called",
    ])
  })

  it("matches no method of a value another call made", () => {
    expect(keysIn(lines("const app = makeApp()", "app.findMany()"))).toStrictEqual([])
  })

  it("takes the first argument of a callback that runs in place to be the value", () => {
    const text = lines("import server from \"server\"", "const app = server()", "app.transaction((inside) => inside.findMany())", "app.post(\"/x\", (request) => request.findMany())")

    expect(keysIn(text).slice(1)).toStrictEqual([
      "factory:default:*>call:transaction:*",
      "factory:default:*>call:find*:*",
      "factory:default:*>call:post:*",
    ])
  })

  it("matches a member of an export through the calls made on it", () => {
    expect(keysIn(lines("import { program } from \"server\"", "program.option(\"-v\").run()"))).toStrictEqual(["call:program.run:*"])
  })

  it("matches an export handed to a method by name, with the arguments after it", () => {
    const [match] = matchSource(
      { filePath: null, language: "javascript", text: lines("import { plugin } from \"server\"", "app.register(plugin, { resolvers: { Query: { users: listUsers } } })") },
      [SERVER],
    )

    expect([match.patternKey, match.slots.map((slot) => slot.runs)]).toStrictEqual(["call:plugin:*", ["resolver"]])
  })
})

describe("the other shapes of a pattern", () => {
  it("matches a decorator, an element, a class that extends an export and a call on that class", () => {
    const text = lines(
      "import { Get, Link, Model } from \"server\"",
      "class User extends Model {}",
      "class Users { @Get(\"/users\") list() {} }",
      "const link = <Link href=\"/cart\" />",
      "User.all()",
      "new User().all()",
    )

    expect(keysIn(text)).toStrictEqual(["class:Model:*", "decorator:Get:*", "element:Link:*", "class:Model:*>call:all:*", "class:Model:*>call:all:*"])
  })

  it("matches a directive at the start of a file or of a function", () => {
    expect(keysIn(lines("\"use server\"", "export const save = () => {", "  \"use server\"", "  return \"use server\"", "}"))).toStrictEqual([
      "directive:use server:*",
      "directive:use server:*",
    ])
  })

  it("matches a file by its path", () => {
    expect(matchFilePath("src/app/users/page.tsx", [SERVER]).map((match) => match.patternKey)).toStrictEqual(["file:{app,src/app}/**/page.{ts,tsx}:*"])
    expect(matchFilePath("lib/app/users/page.tsx", [SERVER])).toStrictEqual([])
  })

  it("reads a glob with folders, choices and a set of characters", () => {
    expect(fitsGlob("**/commands/[!_]*.py", "polls/commands/close.py")).toBe(true)
    expect(fitsGlob("**/commands/[!_]*.py", "polls/commands/_private.py")).toBe(false)
    expect(fitsGlob("{pages,src/pages}/*.{js,ts}", "src/pages/index.ts")).toBe(true)
    expect(fitsGlob("{pages,src/pages}/*.{js,ts}", "src/pages/admin/index.ts")).toBe(false)
  })

  it("matches an element of a Vue file by the name its script imports", () => {
    const text = lines("<script setup>", "import { Link } from \"server\"", "</script>", "<template>", "  <Link href=\"/cart\" />", "  <Link :href=\"cartPath\" />", "</template>")

    expect(matchSource({ filePath: null, language: "javascript", text }, [SERVER]).map((match) => [match.patternKey, match.path])).toStrictEqual([
      ["element:Link:*", "/cart"],
      ["element:Link:*", null],
    ])
  })
})

describe("what a match says", () => {
  const saidBy = (text: string): unknown[] =>
    matchSource({ filePath: null, language: "javascript", text }, [SERVER])
      .filter((match) => match.patternKey !== "factory:default:*")
      .slice(-1)
      .flatMap((match) => [match.path, match.prefix, match.method, match.event, match.makes, match.slots.map((slot) => slot.runs)])

  it("reads the path and the method, and gives the last argument and the rest their slots", () => {
    expect(saidBy(lines("import server from \"server\"", "server().post(\"/users\", checkSession, createUser)"))).toStrictEqual([
      "/users",
      null,
      "POST",
      null,
      null,
      ["route", "middleware"],
    ])
  })

  it("reads a key of an options object, a key of every item of a list and a key path that starts at an argument", () => {
    const text = lines("import { useLoad } from \"server\"", "useLoad({ load: one, pages: [{ load: two }, { load: three }] }, { name: \"loaded\" })")

    expect(saidBy(text)).toStrictEqual([null, null, null, "loaded", null, ["effect", "effect", "effect"]])
  })

  it("reads no function as a path, and leaves it to the rest", () => {
    expect(saidBy(lines("import server from \"server\"", "server().post((request) => request, createUser)"))).toStrictEqual([null, null, "POST", null, null, ["route", "middleware"]])
  })

  it("reads no path that is built while the code runs", () => {
    expect(saidBy(lines("import server from \"server\"", "server().post(base + \"/users\", createUser)")).slice(0, 1)).toStrictEqual([null])
  })

  it("keeps every version of a pattern the call fits when the version is not known", () => {
    const versioned = library("Queries", ["queries"], "javascript", [
      { kind: "call", name: "useQuery", versions: "<5", slots: [{ at: 1, runs: "effect" }] },
      { kind: "call", name: "useQuery", versions: ">=5", slots: [{ at: "queryFn", runs: "effect" }] },
    ])
    const keysOf = (call: string): string[] =>
      matchSource({ filePath: null, language: "javascript", text: lines("import { useQuery } from \"queries\"", call) }, [versioned]).map((match) => match.patternKey)

    expect(keysOf("useQuery({ queryFn: load })")).toStrictEqual(["call:useQuery:>=5"])
    expect(keysOf("useQuery(key, load)")).toStrictEqual(["call:useQuery:<5"])
    expect(keysOf("useQuery(options)")).toStrictEqual(["call:useQuery:<5", "call:useQuery:>=5"])
  })
})

describe("the patterns of the built-in catalogue", () => {
  const slotsIn = (text: string): unknown[] =>
    matchSource({ filePath: null, language: "javascript", text }, BUILT_IN_LIBRARIES).flatMap((match) => match.slots.map((slot) => [match.name, slot.runs, slot.path]))

  it("reads the path of a page from its own record, below the path of the record it is nested in", () => {
    const text = lines(
      "import { createRouter } from \"vue-router\"",
      "const router = createRouter({ routes: [",
      "  { path: \"/user/:id\", component: User, children: [{ path: \"profile\", component: UserProfile }, { path: \"/posts\", component: UserPosts }] },",
      "  { path: \"/about\", component: About },",
      "] })",
    )

    expect(slotsIn(text)).toStrictEqual([
      ["createRouter", "page", "/user/:id"],
      ["createRouter", "page", "/about"],
      ["createRouter", "page", "/user/:id/profile"],
      ["createRouter", "page", "/posts"],
    ])
  })

  it("reads a path that is written as the key of a page", () => {
    expect(slotsIn(lines("import { mount, route } from \"navi\"", "export default mount({ \"/\": route({ view: home }), \"/about\": route({ view: about }) })")).slice(0, 2)).toStrictEqual([
      ["mount", "page", "/"],
      ["mount", "page", "/about"],
    ])
  })

  it("reads the options a Vue file exports as the options of a component", () => {
    const text = lines("<script>", "export default {", "  data() { return { count: 0 } },", "  methods: { increment() { this.count++ } },", "}", "</script>")

    expect(slotsIn(text)).toStrictEqual([
      ["defineComponent", "in-place", null],
      ["defineComponent", "kept", null],
    ])
  })

  it("says the method of a directive", () => {
    const [match] = matchSource({ filePath: null, language: "javascript", text: lines("\"use server\"", "export const save = async () => 1") }, LIBRARIES)

    expect([match.patternKey, match.runs, match.method]).toStrictEqual(["directive:use server:*", "route", "POST"])
  })
})

describe("a Python file", () => {
  it("matches a name of a module, a member of an import and a module imported whole", () => {
    expect(keysIn(lines("from web.cache import cache", "import web", "", "cache.get(\"key\")", "web.cache.cache.get(\"key\")"), "python")).toStrictEqual([
      "call:cache.get:*",
      "call:cache.get:*",
    ])
  })

  it("matches a decorator that is a method of a made value, and reads a place written by position or by name", () => {
    const matches = matchSource(
      { filePath: null, language: "python", text: lines("from web import App", "", "app = App()", "", "@app.get(path=\"/users\")", "def users():", "    ...") },
      [DJANGO],
    )

    expect(matches.map((match) => [match.patternKey, match.path, match.method])).toStrictEqual([
      ["factory:App:*", null, null],
      ["factory:App:*>decorator:get:*", "/users", "GET"],
    ])
  })

  it("matches a class that extends an export, and a call on it and on a value kept under the same name", () => {
    const text = lines("from web import Model", "", "class User(Model):", "    ...", "", "users = User.objects.filter(active=True)", "users = users.filter(admin=True)")

    expect(keysIn(text, "python")).toStrictEqual(["class:Model:*", "class:Model:*>call:filter:*", "class:Model:*>call:filter:*"])
  })
})
