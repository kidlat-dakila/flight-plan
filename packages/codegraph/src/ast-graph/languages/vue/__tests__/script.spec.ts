import { sourceOf, VUE_READING } from "@/ast-graph/languages/__tests__/script-files"
import { optionsComponent, setupComponent } from "./vue-source"

const FILE_PATHS = { "./SaveButton.vue": "src/SaveButton.vue", "./reviews": "src/reviews.ts" }

const { fileOf, syntaxOf, isUsing: isUsingIn, outlineIn, scopeIn, usesIn, variablesIn } = VUE_READING

describe("VueASTGraphFile scripts", () => {
  describe("root encapsulations", () => {
    it("lists a setup script as the component, with the functions it declares", () => {
      const source = setupComponent(
        ["const title = ref('')", "const handleSave = () => {", "  save(title.value)", "}", "function reset() {}", "const api = { load() {} }", "onMounted(() => reset())"],
        ["<p>{{ title }}</p>"],
      )

      expect(outlineIn(source)).toStrictEqual([
        "function default 1-12",
        "  function handleSave 3-5",
        "  function reset 6-6",
        "  method load 7-7",
      ])
    })

    it("lists the component object of a script without setup, with its methods", () => {
      const source = optionsComponent(["export default {", "  data: () => ({ total: 1 }),", "  methods: {", "    save() {},", "  },", "}"], ["<p />"])

      expect(outlineIn(source)).toStrictEqual(["variable default 2-7", "  method data 3-3", "  method save 5-5", "function default 9-11"])
    })

    it("lists the members of a component handed to defineComponent", () => {
      const source = optionsComponent(
        ["export default defineComponent({", "  setup() {", "    const load = () => {}", "  },", "  methods: { save() {} },", "})"],
        ["<p />"],
      )

      expect(outlineIn(source)).toStrictEqual([
        "variable default 2-7",
        "  method setup 3-5",
        "    function load 4-4",
        "  method save 6-6",
        "function default 9-11",
      ])
    })

    it("lists both scripts and the template of one file", () => {
      const source = sourceOf("<script>", "export const LIMIT = 3", "</script>", "<script setup>", "const save = () => {}", "</script>", "<template><p /></template>")

      expect(outlineIn(source)).toStrictEqual(["variable LIMIT 2-2", "function default 4-7", "  function save 5-5"])
    })

    it.each([
      ["a file with only a template", "<template>\n  <p />\n</template>", ["function default 1-3"]],
      ["a file with only a script", "<script setup>\nconst save = () => {}\n</script>", ["function default 1-3", "  function save 2-2"]],
      ["a script that takes its code from another file", "<script src=\"./editor.ts\"></script>", []],
      ["an empty file", "", []],
    ])("lists %s", (_form, source, listed) => {
      expect(outlineIn(source)).toStrictEqual(listed)
    })

    it("finds the root and the nearest encapsulation of a script line and of a template line", () => {
      const file = fileOf(setupComponent(["const handleSave = () => {", "  save()", "}"], ["<button @click=\"handleSave\" />"]))

      expect(file.findRootEncapsulation([3, 3])?.name).toBe("default")
    })
  })

  describe("file variables", () => {
    it("lists what the scripts and the template declare, and the component itself", () => {
      const source = setupComponent(["const lines = []", "const save = (line: Line) => {}"], ["<li v-for=\"(line, index) in lines\" @click=\"(event) => save(line)\" />"])

      expect(variablesIn(source)).toStrictEqual([
        "lines: inline-declaration primitive value",
        "save: inline-declaration function value",
        "line: argument primitive value",
        "line: inline-declaration primitive value",
        "index: inline-declaration primitive value",
        "event: argument primitive value",
        "default: anonymous primitive value",
      ])
    })

    it("lists the component once when the script exports it", () => {
      const source = optionsComponent(["export default { name: 'Editor' }"], ["<p />"])

      expect(variablesIn(source)).toStrictEqual(["default: anonymous primitive value"])
    })

    it("lists the component of a file with only a template", () => {
      expect(variablesIn("<template><p /></template>")).toStrictEqual(["default: anonymous primitive value"])
    })

    it.each([
      ["a variable of a setup script to the file", setupComponent(["const total = 1"], ["<p />"]), "total", "1-6"],
      ["a variable of a script without setup to that script", optionsComponent(["const total = 1"], ["<p />"]), "total", "2-3"],
      ["a variable in a function to its block", setupComponent(["function save() {", "  const total = 1", "}"], ["<p />"]), "total", "2-4"],
      ["the variable of a loop to its element", setupComponent([], ["<ul>", "  <li v-for=\"line in lines\">", "    {{ line }}", "  </li>", "</ul>"]), "line", "5-7"],
      ["the component to the file", setupComponent(["const total = 1"], ["<p />"]), "default", "1-6"],
    ])("limits %s", (_rule, source, name, scope) => {
      expect(scopeIn(source, name)).toBe(scope)
    })
  })

  describe("uses", () => {
    it("reports the uses in a script on the lines of the file", () => {
      const source = setupComponent(["import { saveReview } from './reviews'", "", "const save = () =>", "  saveReview()"], ["<p />"])

      expect(usesIn(source, "saveReview")).toStrictEqual(["«saveReview»()"])
      expect(syntaxOf(source).importVariables[0].range).toStrictEqual({ start: { line: 2, column: 9 }, end: { line: 2, column: 19 } })
    })

    it("reads a script written in JavaScript with JSX", () => {
      const source = sourceOf("<script setup>", "import Icon from './Icon.vue'", "const icon = () => <Icon />", "</script>")

      expect(usesIn(source, "Icon")).toStrictEqual(["const icon = () => <«Icon» />"])
    })

    it("reads code that starts on the line of the script tag", () => {
      const source = sourceOf("<script setup>const total = 1; const double = total * 2</script>")

      expect(usesIn(source, "total")).toStrictEqual(["<script setup>const total = 1; const double = «total» * 2</script>"])
    })
  })

  describe("import variables", () => {
    const isUsing = (filePath: string, name: string, script: readonly string[], template: readonly string[]): boolean =>
      isUsingIn(setupComponent(script, template), { filePath, name }, FILE_PATHS)

    it("lists the imports of every script with the files they were resolved to", () => {
      const source = sourceOf("<script>", "import { saveReview } from './reviews'", "</script>", "<script setup>", "import SaveButton from './SaveButton.vue'", "import { ref } from 'vue'", "</script>")

      expect(syntaxOf(source, FILE_PATHS).importVariables.map(({ name, importedName, importedFilePath }) => [name, importedName, importedFilePath])).toStrictEqual([
        ["saveReview", "saveReview", "src/reviews.ts"],
        ["SaveButton", "default", "src/SaveButton.vue"],
        ["ref", "ref", null],
      ])
    })

    it.each([
      ["renders a component it imports", "src/SaveButton.vue", "default", ["import SaveButton from './SaveButton.vue'"], ["<SaveButton />"]],
      ["renders a component it imports, written with dashes", "src/SaveButton.vue", "default", ["import SaveButton from './SaveButton.vue'"], ["<save-button />"]],
      ["hands an import to a handler", "src/reviews.ts", "saveReview", ["import { saveReview } from './reviews'"], ["<button @click=\"saveReview\" />"]],
      ["calls an import in its script", "src/reviews.ts", "saveReview", ["import { saveReview } from './reviews'", "saveReview()"], ["<p />"]],
    ])("says a file uses a symbol when it %s", (_reason, filePath, name, script, template) => {
      expect(isUsing(filePath, name, script, template)).toBe(true)
    })

    it.each([
      ["imports a component and never renders it", "src/SaveButton.vue", "default", ["import SaveButton from './SaveButton.vue'"], ["<p />"]],
      ["only uses a loop variable that hides the import", "src/reviews.ts", "saveReview", ["import { saveReview } from './reviews'"], ["<li v-for=\"saveReview in handlers\" @click=\"saveReview\" />"]],
    ])("says a file does not use a symbol when it %s", (_reason, filePath, name, script, template) => {
      expect(isUsing(filePath, name, script, template)).toBe(false)
    })
  })
})
