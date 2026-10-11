import { blockNamed, codeOf, groupOf, outlineOf, rangeAt, symbolsOf } from "@/code-blocks/__tests__/group-fixture"
import type { StoredCodeBlock, StoredCodeGroupGraph } from "@/code-blocks/stored-types"

const PAGE_PATH = "src/UsersPage.vue"
const BUTTON_PATH = "src/SaveButton.vue"

const USERS_PAGE = codeOf(
  "<script setup lang=\"ts\">",
  "import { ref, onMounted } from \"vue\"",
  "import SaveButton from \"./SaveButton.vue\"",
  "import { loadUsers, removeUser } from \"./users\"",
  "",
  "const props = defineProps<{ title: string }>()",
  "const users = ref(loadUsers())",
  "const handleDelete = (id: string) => {",
  "  removeUser(id)",
  "}",
  "onMounted(() => { loadUsers() })",
  "</script>",
  "",
  "<template>",
  "  <h1>{{ title }} {{ props.title }}</h1>",
  "  <ul v-if=\"users.length\">",
  "    <li v-for=\"user in users\" :key=\"user.id\">",
  "      <button @click=\"handleDelete(user.id)\">Delete</button>",
  "    </li>",
  "  </ul>",
  "  <SaveButton @save=\"handleDelete\" :label=\"title\" />",
  "</template>",
)
const SAVE_BUTTON = codeOf(
  "<script setup lang=\"ts\">",
  "defineProps<{ label: string }>()",
  "const emit = defineEmits<{ (e: \"save\", id: string): void }>()",
  "</script>",
  "<template>",
  "  <button @click=\"emit('save', '1')\">{{ label }}</button>",
  "</template>",
)
const USERS = codeOf("export const loadUsers = () => []", "export const removeUser = (id: string) => id")

const shop = (): StoredCodeGroupGraph => groupOf({ [PAGE_PATH]: USERS_PAGE, [BUTTON_PATH]: SAVE_BUTTON, "src/users.ts": USERS })

const blockAt = (group: StoredCodeGroupGraph, id: string): StoredCodeBlock => {
  const block = group.codeBlocks.find((candidate) => candidate.id === id)
  if (block === undefined) throw new Error(`There is no block ${id}.`)
  return block
}

const outlineOfFile = (...lines: readonly string[]): string[] => outlineOf(groupOf({ "src/Card.vue": codeOf(...lines) }), "src/Card.vue")

describe("the blocks of a Vue file", () => {
  it("makes one function of the setup script and the template, named after the file, with the blocks of the script as the body of a component", () => {
    expect(outlineOf(shop(), PAGE_PATH).slice(0, 9)).toStrictEqual([
      "component UsersPage 1:1-22:12",
      "  root-argument-value title 6:29-6:34",
      "  variable props 6:1-6:47",
      "  state users 7:1-7:31",
      "  function handleDelete 8:1-10:2",
      "    variable id 8:23-8:33",
      "  component-effect 11:1-11:33",
      "    effect-callback 0 11:11-11:32",
      "      function 11:11-11:32",
    ])
  })

  it("keeps an import and a type of the setup script at the root of the file, outside the component", () => {
    const typed = USERS_PAGE.replace("const props = defineProps<{ title: string }>()", "interface Props { title: string }\nconst props = defineProps<Props>()")

    expect(outlineOf(shop(), PAGE_PATH).slice(19)).toStrictEqual(["import 2:1-2:37", "import 3:1-3:42", "import 4:1-4:48"])
    expect(outlineOf(groupOf({ [PAGE_PATH]: typed }), PAGE_PATH).filter((line) => line.startsWith("type-declaration"))).toStrictEqual(["type-declaration Props 6:1-6:34"])
  })

  it("places a change of an import of the setup script in the import, not in the component", () => {
    const group = groupOf({ [PAGE_PATH]: USERS_PAGE }, { [PAGE_PATH]: [rangeAt(3, 1, 3, 42)] })

    expect(group.diffBlockIds).toStrictEqual(["src/UsersPage.vue#import@3:1"])
    expect(group.diffChainIds).toStrictEqual([])
  })

  it("makes a render-root of the template, a render of each element, a render-condition of v-if, a render-loop of v-for and a render-event of a listener", () => {
    expect(outlineOf(shop(), PAGE_PATH).slice(9, 19)).toStrictEqual([
      "  render-root 14:1-22:12",
      "    render h1 15:3-15:41",
      "    render-condition 16:3-20:8",
      "      render ul 16:3-20:8",
      "        render-loop 17:5-19:10",
      "          render li 17:5-19:10",
      "            render button 18:7-18:61",
      "              render-event onClick 18:15-18:45",
      "    render SaveButton 21:3-21:53",
      "      render-event onSave 21:15-21:35",
    ])
  })

  it("makes a root-argument-value of each prop and of each event the component emits, named as the listener of that event", () => {
    expect(outlineOf(shop(), BUTTON_PATH)).toStrictEqual([
      "component SaveButton 1:1-7:12",
      "  root-argument-value label 2:15-2:20",
      "  root-argument-value onSave 3:32-3:38",
      "  variable emit 3:1-3:62",
      "  render-root 5:1-7:12",
      "    render button 6:3-6:58",
      "      render-event onClick 6:11-6:37",
    ])
  })

  it("reads the props a component declares as an object, as a list, or takes apart", () => {
    const argumentsOf = (macro: string): string[] => outlineOfFile("<script setup>", macro, "</script>", "<template><b /></template>").filter((line) => line.includes("root-argument-value"))

    expect(argumentsOf("const props = defineProps({ label: String, size: Number })")).toStrictEqual(["  root-argument-value label 2:29-2:34", "  root-argument-value size 2:44-2:48"])
    expect(argumentsOf("defineProps([\"label\"])")).toStrictEqual(["  root-argument-value label 2:14-2:21"])
    expect(argumentsOf("const { label } = withDefaults(defineProps<Props>(), {})")).toStrictEqual(["  root-argument-value label 2:9-2:14"])
    expect(argumentsOf("const emit = defineEmits([\"save\", \"update:label\"])")).toStrictEqual([
      "  root-argument-value onSave 2:27-2:33",
      "  root-argument-value onUpdate:label 2:35-2:49",
    ])
  })

  it("keeps a script without setup at the root of the file, beside the component of the template", () => {
    expect(outlineOfFile("<script>", "export const LIMIT = 3", "</script>", "<template>", "  <p />", "</template>")).toStrictEqual([
      "component Card 4:1-6:12",
      "  render-root 4:1-6:12",
      "    render p 5:3-5:8",
      "root-variable LIMIT 2:1-2:23",
    ])
  })

  it("exports the component as the default of the file, and what a script without setup exports", () => {
    const group = groupOf({ "src/Card.vue": codeOf("<script>", "export const LIMIT = 3", "export default {}", "</script>", "<template><p /></template>") })

    expect(group.astGraphs[0].exports).toStrictEqual({ default: "src/Card.vue#component@5:1", LIMIT: "src/Card.vue#root-variable@2:1" })
  })
})

describe("the uses of a Vue file", () => {
  it("reads a name of the template as a use of what the setup script declares, and a prop by its own name or through the props", () => {
    const group = shop()

    expect(symbolsOf(blockAt(group, "src/UsersPage.vue#render@15:3"))).toStrictEqual([
      "value internal-code-block src/UsersPage.vue#root-argument-value@6:29",
      "value internal-code-block src/UsersPage.vue#root-argument-value@6:29",
    ])
    expect(symbolsOf(blockAt(group, "src/UsersPage.vue#render@16:3"))).toStrictEqual(["read internal-code-block src/UsersPage.vue#state@7:1 length"])
  })

  it("reads a name of the template as a use of a method, a computed value or a key of the data of a script without setup", () => {
    const group = groupOf({
      "src/Card.vue": codeOf(
        "<script>",
        "export default {",
        "  data() {",
        "    return { count: 0 }",
        "  },",
        "  computed: {",
        "    total() { return 2 },",
        "  },",
        "  methods: {",
        "    remove(id) {},",
        "  },",
        "}",
        "</script>",
        "<template>",
        "  <p>{{ count }} {{ total }}</p>",
        "  <button @click=\"remove(1)\">Remove</button>",
        "</template>",
      ),
    })

    expect(symbolsOf(blockAt(group, "src/Card.vue#render@15:3"))).toStrictEqual(["value internal-code-block src/Card.vue#property@4:14", "value internal-code-block src/Card.vue#function@7:5"])
    expect(symbolsOf(blockAt(group, "src/Card.vue#render-event@16:11"))).toStrictEqual(["call internal-code-block src/Card.vue#function@10:5"])
  })

  it("reads a member taken from this in a script without setup as a use of the method, the computed value, the key of the data or the prop of that name", () => {
    const group = groupOf({
      "src/Card.vue": codeOf(
        "<script>",
        "export default {",
        "  props: [\"label\"],",
        "  data() {",
        "    return { count: 0 }",
        "  },",
        "  computed: {",
        "    total() { return this.count },",
        "  },",
        "  methods: {",
        "    remove(id) { return this.label },",
        "    clear() {",
        "      this.remove(this.total)",
        "      return [1].map(() => this.remove(2))",
        "    },",
        "    later() { return function () { return this.remove(3) } },",
        "  },",
        "}",
        "</script>",
        "<template>",
        "  <p />",
        "</template>",
      ),
    })

    expect(symbolsOf(blockNamed(group, "function", "total"))).toStrictEqual(["value internal-code-block src/Card.vue#property@5:14"])
    expect(symbolsOf(blockNamed(group, "function", "remove"))).toStrictEqual(["value internal-code-block src/Card.vue#root-argument-value@3:11"])
    expect(symbolsOf(blockNamed(group, "function", "clear"))).toStrictEqual([
      "call internal-code-block src/Card.vue#function@11:5",
      "value internal-code-block src/Card.vue#function@8:5",
    ])
    expect(group.codeBlocks.filter((block) => block.parentBlockId === blockNamed(group, "function", "clear").id).flatMap(symbolsOf)).toStrictEqual(["call internal-code-block src/Card.vue#function@11:5"])
    expect(symbolsOf(blockNamed(group, "function", "later"))).toStrictEqual([])
  })

  it("reads a name of the template as a use of a prop a script without setup declares, as a list or as an object, and hands a bound value to it", () => {
    const cardOf = (props: string): string => codeOf("<script>", "export default {", `  props: ${props},`, "}", "</script>", "<template>", "  <p>{{ label }}</p>", "</template>")
    const page = codeOf("<script setup>", "import Card from \"./Card.vue\"", "const title = 1", "</script>", "<template>", "  <Card :label=\"title\" />", "</template>")
    const listed = groupOf({ "src/Card.vue": cardOf("[\"label\"]"), "src/Page.vue": page })
    const typed = groupOf({ "src/Card.vue": cardOf("{ label: String }") })

    expect(outlineOf(listed, "src/Card.vue")).toStrictEqual([
      "component Card 6:1-8:12",
      "  root-argument-value label 3:11-3:18",
      "  render-root 6:1-8:12",
      "    render p 7:3-7:21",
      "root-variable default 2:1-4:2",
      "  property props 3:3-3:19",
    ])
    expect(symbolsOf(blockAt(listed, "src/Card.vue#render@7:3"))).toStrictEqual(["value internal-code-block src/Card.vue#root-argument-value@3:11"])
    expect(blockAt(listed, "src/Card.vue#root-argument-value@3:11").handedFrom).toHaveLength(1)
    expect(symbolsOf(blockAt(typed, "src/Card.vue#render@7:3"))).toStrictEqual(["value internal-code-block src/Card.vue#root-argument-value@3:12"])
  })

  it("makes an event of each item of the emits of a script without setup, and reads this.$emit as a call of the event it names", () => {
    const group = groupOf({
      "src/Card.vue": codeOf(
        "<script>",
        "export default {",
        "  emits: [\"save\"],",
        "  methods: {",
        "    store() { this.$emit(\"save\") },",
        "    drop() { this.$emit(\"remove\") },",
        "  },",
        "}",
        "</script>",
        "<template>",
        "  <p />",
        "</template>",
      ),
    })

    expect(outlineOf(group, "src/Card.vue").filter((line) => line.includes("root-argument-value"))).toStrictEqual([
      "  root-argument-value onSave 3:11-3:17",
      "  root-argument-value onRemove 6:25-6:33",
    ])
    expect(symbolsOf(blockNamed(group, "function", "store"))).toStrictEqual(["call internal-code-block src/Card.vue#root-argument-value@3:11"])
    expect(symbolsOf(blockNamed(group, "function", "drop"))).toStrictEqual(["call internal-code-block src/Card.vue#root-argument-value@6:25"])
  })

  it("hands an event a listener of a component emits on to the event listened for, and keeps an emit of a built-in element a call", () => {
    const checkout = codeOf(
      "<script setup>",
      "import SaveButton from \"./SaveButton.vue\"",
      "const emit = defineEmits([\"checkout\"])",
      "</script>",
      "<template>",
      "  <SaveButton @save=\"emit('checkout')\" />",
      "  <button @click=\"emit('checkout')\">Pay</button>",
      "</template>",
    )
    const group = groupOf({ "src/CheckoutButton.vue": checkout, [BUTTON_PATH]: SAVE_BUTTON })
    const handedOf = ({ outerSymbols }: StoredCodeBlock): string[] => outerSymbols.map((symbol) => `${symbol.use} → ${symbol.handedToId ?? "nothing"}`)

    expect(handedOf(blockAt(group, "src/CheckoutButton.vue#render-event@6:15"))).toStrictEqual(["call → nothing", "value → src/SaveButton.vue#root-argument-value@3:32"])
    expect(handedOf(blockAt(group, "src/CheckoutButton.vue#render-event@7:11"))).toStrictEqual(["call → nothing", "call → nothing"])
  })

  it("reads the members of a component handed to defineComponent, and none of a script beside a setup script", () => {
    const usesOf = (...script: readonly string[]): string[] => {
      const group = groupOf({ "src/Card.vue": codeOf(...script, "<template>", "  <button @click=\"remove(1)\">Remove</button>", "</template>") })
      return group.codeBlocks.filter((block) => block.type === "render-event").flatMap(symbolsOf)
    }
    const options = ["export default defineComponent({", "  methods: { remove(id) {} },", "})"]

    expect(usesOf("<script>", ...options, "</script>")).toStrictEqual(["call internal-code-block src/Card.vue#function@3:14"])
    expect(usesOf("<script>", ...options, "</script>", "<script setup>", "const title = 1", "</script>")).toStrictEqual([])
  })

  it("leaves out a name the element declares itself: the variable of a v-for and the properties of a slot", () => {
    const group = shop()
    const scoped = groupOf({
      "src/Card.vue": codeOf("<script setup>", "const row = 1", "</script>", "<template>", "  <List #item=\"{ row }\"><b>{{ row }}</b></List>", "  <i>{{ row }}</i>", "</template>"),
    })

    expect(symbolsOf(blockAt(group, "src/UsersPage.vue#render-event@18:15"))).toStrictEqual(["call internal-code-block src/UsersPage.vue#function@8:1"])
    expect(scoped.codeBlocks.filter((block) => block.outerSymbols.length > 0).map((block) => block.name)).toStrictEqual(["i"])
  })

  it("reads the tag of a component as a render of what the script imports, written in capitals or with dashes", () => {
    const withDashes = groupOf({ [PAGE_PATH]: USERS_PAGE.replace("<SaveButton @save", "<save-button @save"), [BUTTON_PATH]: SAVE_BUTTON, "src/users.ts": USERS })

    expect(symbolsOf(blockAt(shop(), "src/UsersPage.vue#render@21:3"))[0]).toBe("render external-block src/SaveButton.vue#component@1:1")
    expect(symbolsOf(blockAt(withDashes, "src/UsersPage.vue#render@21:3"))[0]).toBe("render external-block src/SaveButton.vue#component@1:1")
  })

  it("hands a value bound to a component to the prop of that name, and a listener to the event it listens for", () => {
    const group = shop()
    const handedOf = (id: string): (string | null)[] => blockAt(group, id).outerSymbols.map((symbol) => symbol.handedToId ?? null)

    expect(handedOf("src/UsersPage.vue#render@21:3")).toStrictEqual([null, "src/SaveButton.vue#root-argument-value@2:15"])
    expect(handedOf("src/UsersPage.vue#render-event@21:15")).toStrictEqual(["src/SaveButton.vue#root-argument-value@3:32"])
  })

  it("reads an emit as a call of the event it names, in the template and in the script", () => {
    const inScript = SAVE_BUTTON.replace("</script>", "const save = () => emit(\"save\", \"2\")\n</script>")
    const group = groupOf({ [BUTTON_PATH]: inScript })
    const inTemplate = groupOf({ [BUTTON_PATH]: SAVE_BUTTON.replace("emit('save', '1')", "$emit('save')") })

    expect(symbolsOf(blockNamed(group, "function", "save"))).toContain("call internal-code-block src/SaveButton.vue#root-argument-value@3:32")
    expect(symbolsOf(blockNamed(inTemplate, "render-event", "onClick"))).toStrictEqual(["call internal-code-block src/SaveButton.vue#root-argument-value@3:32"])
  })

  it("leads from the event a component emits to the handler of the component that listens for it", () => {
    const group = groupOf({ [PAGE_PATH]: USERS_PAGE, [BUTTON_PATH]: SAVE_BUTTON, "src/users.ts": USERS }, { "src/users.ts": [{ start: { line: 2, column: 40 }, end: { line: 2, column: 42 } }] })

    expect(group.diffChainIds).toStrictEqual(["src/UsersPage.vue#render-event@18:15", "src/SaveButton.vue#render-event@6:11"])
    expect(blockAt(group, "src/SaveButton.vue#root-argument-value@3:32").nextBlockIds).toStrictEqual(["src/UsersPage.vue#function@8:1"])
  })
})
