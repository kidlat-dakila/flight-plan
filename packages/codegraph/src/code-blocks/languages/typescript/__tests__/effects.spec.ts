import { codeOf, groupOf, outlineOf } from "@/code-blocks/__tests__/group-fixture"

const outlineOfCode = (...lines: readonly string[]): string[] => outlineOf(groupOf({ "src/file.tsx": codeOf(...lines) }), "src/file.tsx")

describe("what counts as an effect", () => {
  it("makes an effect of a call that is handed a function, with an effect-callback named after its position", () => {
    expect(outlineOfCode("function save() {", "  setTimeout(() => 1, 500)", "}")).toStrictEqual([
      "function save 1:1-3:2",
      "  effect 2:3-2:27",
      "    effect-callback 0 2:14-2:21",
      "      function 2:14-2:21",
    ])
  })

  it("names an effect-callback after its key when it is a property of an options object", () => {
    expect(outlineOfCode("function save() {", "  run({ retries: 3, queryFn: () => 1, select(data) {} })", "}")).toStrictEqual([
      "function save 1:1-3:2",
      "  effect 2:3-2:57",
      "    property retries 2:9-2:19",
      "    effect-callback queryFn 2:21-2:37",
      "      function 2:30-2:37",
      "    effect-callback select 2:39-2:54",
      "      function 2:39-2:54",
      "        variable data 2:46-2:50",
    ])
  })

  it("counts a callback passed by name when the name leads to a function", () => {
    expect(outlineOfCode("const sync = () => 1", "const limit = 3", "function save() {", "  run(sync, limit)", "  run({ mutationFn: sync, retries: limit })", "}")).toStrictEqual([
      "function sync 1:1-1:21",
      "root-variable limit 2:1-2:16",
      "function save 3:1-6:2",
      "  effect 4:3-4:19",
      "    effect-callback 0 4:7-4:11",
      "  effect 5:3-5:44",
      "    effect-callback mutationFn 5:9-5:25",
      "    property retries 5:27-5:41",
    ])
  })

  it("counts a callback passed by name when the name leads to a function of another file", () => {
    const group = groupOf({
      "src/users.ts": codeOf("export const removeUser = () => 1", "export const MAX = 3"),
      "src/index.ts": codeOf("export { removeUser as remove, MAX } from \"./users\""),
      "src/page.ts": codeOf("import { remove, MAX } from \"./index\"", "function save() {", "  run(remove)", "  run(MAX)", "}"),
    })

    expect(outlineOf(group, "src/page.ts")).toStrictEqual([
      "import 1:1-1:38",
      "function save 2:1-5:2",
      "  effect 3:3-3:14",
      "    effect-callback 0 3:7-3:13",
      "  call run 4:3-4:11",
    ])
  })

  it("makes a code-event of a callback whose key starts with on and a capital letter, whatever it is handed", () => {
    expect(outlineOfCode("function save(done) {", "  run({ onSuccess: done, once: done })", "}")).toStrictEqual([
      "function save 1:1-3:2",
      "  root-argument-value done 1:15-1:19",
      "  effect 2:3-2:39",
      "    code-event onSuccess 2:9-2:24",
      "    property once 2:26-2:36",
    ])
  })

  it("makes no effect of a call to a collection method or a promise method of the language", () => {
    expect(outlineOfCode("function save(items, saving) {", "  items.map((item) => item.id).filter((id) => id)", "  saving.then(() => 1).catch(() => 2).finally(() => 3)", "}")).toStrictEqual([
      "function save 1:1-4:2",
      "  root-argument-value items 1:15-1:20",
      "    root-argument-value map 2:3-2:12",
      "  root-argument-value saving 1:22-1:28",
      "    root-argument-value then 3:3-3:14",
      "  call 2:3-2:50",
      "    function 2:13-2:30",
      "      variable item 2:14-2:18",
      "    function 2:39-2:49",
      "      variable id 2:40-2:42",
      "  call 3:3-3:55",
      "    function 3:15-3:22",
      "    function 3:30-3:37",
      "    function 3:47-3:54",
    ])
  })

  it("makes a component-effect of an effect directly in the body of a component or of a hook, and an effect anywhere else", () => {
    expect(
      outlineOfCode(
        "const useOrders = () => {",
        "  watch(() => 1)",
        "}",
        "const OrdersPage = () => {",
        "  watch(() => 2)",
        "  const handleSave = () => {",
        "    setTimeout(() => 3, 500)",
        "  }",
        "  return <button />",
        "}",
        "watch(() => 4)",
      ).filter((line) => line.includes("effect ")),
    ).toStrictEqual(["  component-effect 2:3-2:17", "  component-effect 5:3-5:17", "    effect 7:5-7:29", "  effect 11:1-11:15"])
  })

  it("makes two blocks of a declaration that keeps the result of an effect, the call inside the declaration", () => {
    expect(outlineOfCode("const sync = () => 1", "const useOrders = () => {", "  const { mutate } = useMutation({ mutationFn: sync })", "}")).toStrictEqual([
      "function sync 1:1-1:21",
      "hook useOrders 2:1-4:2",
      "  external-value mutate 3:3-3:55",
      "    component-effect 3:22-3:55",
      "      effect-callback mutationFn 3:36-3:52",
    ])
  })

  it("makes a code-event of a listener and of a subscription, by the name of the method", () => {
    expect(
      outlineOfCode("const onKey = () => 1", "document.addEventListener(\"keydown\", onKey)", "bus.once(\"paid\", () => 2)", "store.subscribe(onKey)", "store.on(\"paid\")"),
    ).toStrictEqual([
      "function onKey 1:1-1:22",
      "root-statement 2:1-2:44",
      "  code-event 2:1-2:44",
      "    effect-callback 1 2:38-2:43",
      "root-statement 3:1-3:26",
      "  code-event 3:1-3:26",
      "    effect-callback 1 3:18-3:25",
      "      function 3:18-3:25",
      "root-statement 4:1-4:23",
      "  code-event 4:1-4:23",
      "    effect-callback 0 4:17-4:22",
      "root-statement 5:1-5:17",
    ])
  })
})

describe("the globals of the platform", () => {
  it("makes a data-fetch of a call to fetch that names no method, or names GET", () => {
    expect(
      outlineOfCode(
        "const load = () => fetch(\"/api/users\")",
        "const loadOne = () => fetch(\"/api/users/1\", { method: \"get\", headers })",
        "const loadFresh = () => fetch(\"/api/users\", { cache: \"no-store\" })",
      ),
    ).toStrictEqual([
      "function load 1:1-1:39",
      "  data-fetch 1:20-1:39",
      "function loadOne 2:1-2:72",
      "  data-fetch 2:23-2:72",
      "    property method 2:47-2:60",
      "    property headers 2:62-2:69",
      "function loadFresh 3:1-3:67",
      "  data-fetch 3:25-3:67",
      "    property cache 3:47-3:64",
    ])
  })

  it("makes a request of a call to fetch that names another method, or whose method the call does not write out", () => {
    expect(
      outlineOfCode(
        "const save = () => fetch(\"/api/users\", { method: \"POST\" })",
        "const send = (method) => fetch(\"/api/users\", { method })",
        "const call = (init) => fetch(\"/api/users\", { ...init })",
        "const pass = (init) => fetch(\"/api/users\", init)",
      ),
    ).toStrictEqual([
      "function save 1:1-1:59",
      "  request 1:20-1:59",
      "    property method 1:42-1:56",
      "function send 2:1-2:57",
      "  root-argument-value method 2:15-2:21",
      "  request 2:26-2:57",
      "    property method 2:48-2:54",
      "function call 3:1-3:56",
      "  root-argument-value init 3:15-3:19",
      "  request 3:24-3:56",
      "function pass 4:1-4:49",
      "  root-argument-value init 4:15-4:19",
      "  request 4:24-4:49",
    ])
  })

  it("makes a data-fetch of a stream of server-sent events", () => {
    expect(outlineOfCode("const listen = () => new EventSource(\"/api/events\")")).toStrictEqual([
      "function listen 1:1-1:52",
      "  data-fetch 1:22-1:52",
    ])
  })

  it("makes a config of a read of the environment", () => {
    expect(outlineOfCode("const load = () => [process.env.API_URL, import.meta.env.MODE, process.env]")).toStrictEqual([
      "function load 1:1-1:76",
      "  config 1:21-1:40",
      "  config 1:42-1:62",
      "  config 1:64-1:75",
    ])
  })

  it("makes a storage of what the browser keeps for the user", () => {
    expect(outlineOfCode("const load = () => [localStorage.getItem(\"a\"), sessionStorage.draft, document.cookie, indexedDB.open(\"db\")]")).toStrictEqual([
      "function load 1:1-1:108",
      "  storage 1:21-1:46",
      "  storage 1:48-1:68",
      "  storage 1:70-1:85",
      "  storage 1:87-1:107",
    ])
  })

  it("makes a telemetry of a call on the console", () => {
    expect(outlineOfCode("const load = () => console.warn(\"slow\")")).toStrictEqual(["function load 1:1-1:40", "  telemetry 1:20-1:40"])
  })

  it("makes no block of a name the file declares itself", () => {
    expect(outlineOfCode("import { fetch, console } from \"./platform\"", "const load = () => [fetch(\"/a\"), console.warn(\"b\")]")).toStrictEqual([
      "import 1:1-1:44",
      "function load 2:1-2:52",
    ])
  })

  it("makes an external-value of a declaration that keeps the result of such a call", () => {
    expect(outlineOfCode("const load = async () => {", "  const response = await fetch(\"/api/users\")", "}")).toStrictEqual([
      "function load 1:1-3:2",
      "  external-value response 2:3-2:45",
      "    data-fetch 2:26-2:45",
    ])
  })
})
