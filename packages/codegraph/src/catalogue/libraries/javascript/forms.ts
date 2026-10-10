import type { CatalogueLibrary } from "@/catalogue/types"

export const autoformLibrary: CatalogueLibrary = {
  name: "AutoForm",
  specifiers: ["@autoform/react", "@autoform/zod"],
  documentedVersion: "5.0",
  category: "forms",
  type: "frontend",
  language: "javascript",
  patterns: [
    { kind: "element", name: "AutoForm", slots: [{ at: "onSubmit", runs: "event" }], makes: "validation" },
    {
      kind: "factory",
      name: "ZodProvider",
      makes: "validation",
      methods: [],
    },
  ],
}

export const conformLibrary: CatalogueLibrary = {
  name: "Conform",
  specifiers: ["@conform-to/react", "@conform-to/zod"],
  documentedVersion: "1.21",
  category: "forms",
  type: "frontend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "useForm", slots: [{ at: "onValidate", runs: "in-place" }], makes: "state" },
    { kind: "call", name: "parseWithZod", slots: [], makes: "validation" },
  ],
}

export const formCreateLibrary: CatalogueLibrary = {
  name: "form-create",
  specifiers: ["@form-create/element-ui", "@form-create/ant-design-vue", "@form-create/naive-ui"],
  documentedVersion: "2.6",
  category: "forms",
  type: "frontend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "default.create", slots: [{ at: "1.onSubmit", runs: "event" }], makes: "state" },
  ],
}

export const formischLibrary: CatalogueLibrary = {
  name: "Formisch",
  specifiers: ["@formisch/react", "@formisch/vue"],
  documentedVersion: "1.1",
  category: "forms",
  type: "frontend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "useForm", slots: [], makes: "state" },
    { kind: "call", name: "handleSubmit", slots: [{ at: 1, runs: "event" }] },
    { kind: "element", name: "Form", slots: [{ at: "onSubmit", runs: "event" }], makes: "validation" },
  ],
}

export const formkitLibrary: CatalogueLibrary = {
  name: "FormKit",
  specifiers: ["@formkit/vue"],
  documentedVersion: "2.1",
  category: "forms",
  type: "frontend",
  language: "javascript",
  patterns: [
    { kind: "element", name: "FormKit", slots: [{ at: "onSubmit", runs: "event" }], makes: "validation" },
    { kind: "call", name: "submitForm", slots: [], makes: "publish", eventAt: 0 },
  ],
}

export const reactHookFormLibrary: CatalogueLibrary = {
  name: "React Hook Form",
  specifiers: ["react-hook-form"],
  documentedVersion: "7.89",
  category: "forms",
  type: "frontend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "useForm",
      makes: "state",
      methods: [],
    },
    { kind: "call", name: "useWatch", slots: [], makes: "state" },
  ],
}

export const reactJsonschemaFormLibrary: CatalogueLibrary = {
  name: "react-jsonschema-form",
  specifiers: ["@rjsf/core"],
  documentedVersion: "6.11",
  category: "forms",
  type: "frontend",
  language: "javascript",
  patterns: [
    { kind: "element", name: "default", slots: [{ at: "customValidate", runs: "in-place" }], makes: "validation" },
  ],
}

export const tanstackFormLibrary: CatalogueLibrary = {
  name: "TanStack Form",
  specifiers: ["@tanstack/react-form", "@tanstack/vue-form"],
  documentedVersion: "1.33",
  category: "forms",
  type: "frontend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "useForm",
      makes: "state",
      methods: [
        { kind: "call", name: "handleSubmit", slots: [], makes: "publish" },
      ],
    },
  ],
}

export const veevalidateLibrary: CatalogueLibrary = {
  name: "VeeValidate",
  specifiers: ["vee-validate"],
  documentedVersion: "4.15",
  category: "forms",
  type: "frontend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "useForm",
      makes: "state",
      methods: [
        { kind: "call", name: "handleSubmit", slots: [{ at: 0, runs: "event" }] },
      ],
    },
    { kind: "call", name: "useField", slots: [{ at: 1, runs: "in-place" }], makes: "state" },
  ],
}

export const vueformLibrary: CatalogueLibrary = {
  name: "Vueform",
  specifiers: ["@vueform/vueform"],
  documentedVersion: "1.13",
  category: "forms",
  type: "frontend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "defineConfig", slots: [], makes: "config" },
  ],
}
