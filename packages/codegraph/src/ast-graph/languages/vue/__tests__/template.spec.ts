import { VUE_READING } from "@/ast-graph/languages/__tests__/script-files"
import { optionsComponent, setupComponent } from "./vue-source"

const { usesIn } = VUE_READING

describe("VueASTGraphFile traceUsage in a template", () => {
  it.each([
    ["an interpolation", ["const total = 1"], ["<p>{{ total + 1 }}</p>"], "total", ["<p>{{ «total» + 1 }}</p>"]],
    ["two interpolations on one line", ["const total = 1"], ["<p>{{ total }} of {{ total }}</p>"], "total", ["<p>{{ «total» }} of {{ «total» }}</p>"]],
    ["an interpolation over several lines", ["const total = 1"], ["<p>{{", "  total", "}}</p>"], "total", ["«total»"]],
    ["a bound attribute", ["const total = 1"], ["<p :value=\"total\" />"], "total", ["<p :value=\"«total»\" />"]],
    ["an attribute bound the long way", ["const total = 1"], ["<p v-bind:value=\"total\" />"], "total", ["<p v-bind:value=\"«total»\" />"]],
    ["an object bound to an attribute", ["const isActive = true"], ["<p :class=\"{ active: isActive }\" />"], "isActive", ["<p :class=\"{ active: «isActive» }\" />"]],
    ["a handler named", ["const save = () => {}"], ["<button @click=\"save\" />"], "save", ["<button @click=\"«save»\" />"]],
    ["a handler called", ["const save = () => {}"], ["<button @click=\"save($event)\" />"], "save", ["<button @click=\"«save»($event)\" />"]],
    ["a handler of several statements", ["const save = () => {}"], ["<button @click=\"count++; save()\" />"], "save", ["<button @click=\"count++; «save»()\" />"]],
    ["a handler written as a function", ["const save = () => {}"], ["<button @click=\"(event) => save(event)\" />"], "save", ["<button @click=\"(event) => «save»(event)\" />"]],
    ["a handler bound the long way", ["const save = () => {}"], ["<button v-on:click=\"save\" />"], "save", ["<button v-on:click=\"«save»\" />"]],
    ["a condition", ["const isOpen = true"], ["<p v-if=\"isOpen\" />", "<p v-else-if=\"!isOpen\" />", "<p v-show=\"isOpen\" />"], "isOpen", ["<p v-if=\"«isOpen»\" />", "<p v-else-if=\"!«isOpen»\" />", "<p v-show=\"«isOpen»\" />"]],
    ["a model", ["const title = ref('')"], ["<input v-model.trim=\"title\" />"], "title", ["<input v-model.trim=\"«title»\" />"]],
    ["the source of a loop", ["const lines = []"], ["<li v-for=\"line in lines\" />"], "lines", ["<li v-for=\"line in «lines»\" />"]],
    ["the source of a loop written with of", ["const lines = []"], ["<li v-for=\"(line, index) of lines\" />"], "lines", ["<li v-for=\"(line, index) of «lines»\" />"]],
    ["a component", ["import SaveButton from './SaveButton.vue'"], ["<SaveButton />"], "SaveButton", ["<«SaveButton» />"]],
    ["a component with children, once", ["import Editor from './Editor.vue'"], ["<Editor>text</Editor>"], "Editor", ["<«Editor»>text</Editor>"]],
    ["a component written with dashes", ["import SaveButton from './SaveButton.vue'"], ["<save-button />"], "SaveButton", ["<«save-button» />"]],
    ["the object of a member component", ["import * as Form from './form'"], ["<Form.Field />"], "Form", ["<«Form».Field />"]],
    ["a component chosen at run time", ["import Editor from './Editor.vue'"], ["<component :is=\"Editor\" />"], "Editor", ["<component :is=\"«Editor»\" />"]],
    ["a directive of its own", ["const vFocus = {}"], ["<input v-focus />"], "vFocus", ["<input «v-focus» />"]],
    ["a directive of its own with a value", ["const vClickOutside = {}"], ["<p v-click-outside=\"close\" />"], "vClickOutside", ["<p «v-click-outside»=\"close\" />"]],
  ])("finds a use in %s", (_form, script, template, name, uses) => {
    expect(usesIn(setupComponent(script, template), name)).toStrictEqual(uses)
  })

  it.each([
    ["a built-in element of that name", ["const button = 1"], ["<button>save</button>"], "button"],
    ["a plain attribute value", ["const total = 1"], ["<p title=\"total\">x</p>"], "total"],
    ["text outside an interpolation", ["const total = 1"], ["<p>total</p>"], "total"],
    ["the name of an attribute", ["const title = 1"], ["<p :title=\"other\" />"], "title"],
    ["a property read in an expression", ["const name = 1"], ["<p>{{ user.name }}</p>"], "name"],
    ["a key of an object bound to an attribute", ["const active = 1"], ["<p :class=\"{ active: isActive }\" />"], "active"],
    ["a built-in directive", ["const vIf = 1"], ["<p v-if=\"isOpen\" />"], "vIf"],
    ["the property of a member component", ["const Field = 1"], ["<Form.Field />"], "Field"],
  ])("does not count %s as a use", (_form, script, template, name) => {
    expect(usesIn(setupComponent(script, template), name)).toStrictEqual([])
  })

  it("reads a template with unquoted, empty, broken and commented-out expressions", () => {
    const source = setupComponent(
      ["const total = 1", "const save = () => {}"],
      [
        "<!-- {{ total }} -->",
        "<p :value=total :title=\"\" @click=\"save(\" v-for=\"broken\">{{ }}</p>",
        "<template v-if=\"total\">",
        "  <p>{{ total }}</p>",
        "</template>",
      ],
    )

    expect(usesIn(source, "total")).toStrictEqual(["<p :value=«total» :title=\"\" @click=\"save(\" v-for=\"broken\">{{ }}</p>", "<template v-if=\"«total»\">", "<p>{{ «total» }}</p>"])
    expect(usesIn(source, "save")).toStrictEqual(["<p :value=total :title=\"\" @click=\"«save»(\" v-for=\"broken\">{{ }}</p>"])
  })

  describe("scopes", () => {
    it("keeps the variable of a loop inside its element", () => {
      const source = setupComponent(["const line = 1"], ["<li v-for=\"line in lines\" :key=\"line.id\">{{ line.name }}</li>", "<p>{{ line }}</p>"])

      expect(usesIn(source, "line", 0)).toStrictEqual(["<p>{{ «line» }}</p>"])
      expect(usesIn(source, "line", 1)).toStrictEqual(["<li v-for=\"line in lines\" :key=\"«line».id\">{{ «line».name }}</li>"])
    })

    it("finds the uses of every name a loop takes apart", () => {
      const source = setupComponent([], ["<li v-for=\"({ id, name: label }, index) in lines\" :key=\"id\">{{ index }}: {{ label }}</li>"])

      expect(usesIn(source, "id")).toStrictEqual(["<li v-for=\"({ id, name: label }, index) in lines\" :key=\"«id»\">{{ index }}: {{ label }}</li>"])
      expect(usesIn(source, "label")).toStrictEqual(["<li v-for=\"({ id, name: label }, index) in lines\" :key=\"id\">{{ index }}: {{ «label» }}</li>"])
      expect(usesIn(source, "index")).toStrictEqual(["<li v-for=\"({ id, name: label }, index) in lines\" :key=\"id\">{{ «index» }}: {{ label }}</li>"])
    })

    it("keeps the properties of a slot inside its element", () => {
      const source = setupComponent(
        ["const item = 1"],
        ["<DataTable>", "  <template #row=\"{ item }\">{{ item.name }}</template>", "  <template v-slot:footer=\"footer\">{{ footer.total }}</template>", "</DataTable>", "<p>{{ item }}</p>"],
      )

      expect(usesIn(source, "item", 0)).toStrictEqual(["<p>{{ «item» }}</p>"])
      expect(usesIn(source, "item", 1)).toStrictEqual(["<template #row=\"{ item }\">{{ «item».name }}</template>"])
      expect(usesIn(source, "footer")).toStrictEqual(["<template v-slot:footer=\"footer\">{{ «footer».total }}</template>"])
    })

    it("keeps the parameter of a handler inside it", () => {
      const source = setupComponent(["const event = 1"], ["<button @click=\"(event) => save(event)\">{{ event }}</button>"])

      expect(usesIn(source, "event", 0)).toStrictEqual(["<button @click=\"(event) => save(event)\">{{ «event» }}</button>"])
      expect(usesIn(source, "event", 1)).toStrictEqual(["<button @click=\"(event) => save(«event»)\">{{ event }}</button>"])
    })

    it("does not show the template what a script without setup declares", () => {
      const source = optionsComponent(["const total = 1", "export default { data: () => ({ total }) }"], ["<p>{{ total }}</p>"])

      expect(usesIn(source, "total")).toStrictEqual(["export default { data: () => ({ «total» }) }"])
    })

    it("shows the template what both scripts declare when one of them is a setup", () => {
      const source = [
        "<script lang=\"ts\">",
        "import { format } from \"./format\"",
        "</script>",
        "<template>",
        "  <p>{{ format(total) }}</p>",
        "</template>",
        "<script setup lang=\"ts\">",
        "const total = 1",
        "</script>",
      ].join("\n")

      expect(usesIn(source, "format")).toStrictEqual(["<p>{{ «format»(total) }}</p>"])
      expect(usesIn(source, "total")).toStrictEqual(["<p>{{ format(«total») }}</p>"])
    })
  })
})
