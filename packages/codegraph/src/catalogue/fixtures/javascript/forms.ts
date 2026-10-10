import type { PatternFixture } from "@/catalogue/types"

const AUTOFORM = "AutoForm"

export const autoformFixtures: readonly PatternFixture[] = [
  {
    library: AUTOFORM,
    patternKey: "element:AutoForm:*",
    matches: [
      "import { AutoForm } from \"@autoform/react\"\nconst form = <AutoForm schema={schemaProvider} onSubmit={save} withSubmit />",
    ],
    rejects: [
      "const AutoForm = (props) => props.children\nconst form = <AutoForm schema={schemaProvider} onSubmit={save} withSubmit />",
    ],
  },
  {
    library: AUTOFORM,
    patternKey: "factory:ZodProvider:*",
    matches: [
      "import { ZodProvider } from \"@autoform/zod\"\nconst schemaProvider = new ZodProvider(schema)",
    ],
    rejects: [
      "const ZodProvider = (...parts) => parts\nconst schemaProvider = new ZodProvider(schema)",
    ],
  },
]

const CONFORM = "Conform"

export const conformFixtures: readonly PatternFixture[] = [
  {
    library: CONFORM,
    patternKey: "call:useForm:*",
    matches: [
      "import { useForm } from \"@conform-to/react\"\nconst [form, fields] = useForm({ onValidate({ formData }) { return parseWithZod(formData, { schema }) } })",
    ],
    rejects: [
      "const useForm = (...parts) => parts\nconst [form, fields] = useForm({ onValidate({ formData }) { return parseWithZod(formData, { schema }) } })",
    ],
  },
  {
    library: CONFORM,
    patternKey: "call:parseWithZod:*",
    matches: [
      "import { parseWithZod } from \"@conform-to/zod\"\nconst submission = parseWithZod(formData, { schema })",
    ],
    rejects: [
      "const parseWithZod = (...parts) => parts\nconst submission = parseWithZod(formData, { schema })",
    ],
  },
]

const FORM_CREATE = "form-create"

export const formCreateFixtures: readonly PatternFixture[] = [
  {
    library: FORM_CREATE,
    patternKey: "call:default.create:*",
    matches: [
      "import formCreate from \"@form-create/element-ui\"\nconst fApi = formCreate.create(rule, { onSubmit: (formData) => save(formData) })",
    ],
    rejects: [
      "const formCreate = makeLocalRegistry()\nconst fApi = formCreate.create(rule, { onSubmit: (formData) => save(formData) })",
    ],
  },
]

const FORMISCH = "Formisch"

export const formischFixtures: readonly PatternFixture[] = [
  {
    library: FORMISCH,
    patternKey: "call:useForm:*",
    matches: [
      "import { useForm } from \"@formisch/react\"\nconst loginForm = useForm({ schema: LoginSchema })",
    ],
    rejects: [
      "const useForm = (...parts) => parts\nconst loginForm = useForm({ schema: LoginSchema })",
    ],
  },
  {
    library: FORMISCH,
    patternKey: "call:handleSubmit:*",
    matches: [
      "import { handleSubmit } from \"@formisch/react\"\nconst submit = handleSubmit(loginForm, (output) => { save(output) })",
    ],
    rejects: [
      "const handleSubmit = (...parts) => parts\nconst submit = handleSubmit(loginForm, (output) => { save(output) })",
    ],
  },
  {
    library: FORMISCH,
    patternKey: "element:Form:*",
    matches: [
      "import { Form } from \"@formisch/react\"\nconst form = <Form of={loginForm} onSubmit={save} />",
    ],
    rejects: [
      "const Form = (props) => props.children\nconst form = <Form of={loginForm} onSubmit={save} />",
    ],
  },
]

const FORMKIT = "FormKit"

export const formkitFixtures: readonly PatternFixture[] = [
  {
    library: FORMKIT,
    patternKey: "element:FormKit:*",
    matches: [
      "import { FormKit } from \"@formkit/vue\"\nconst form = <FormKit type=\"form\" onSubmit={submitToMailchimp} />",
    ],
    rejects: [
      "const FormKit = (props) => props.children\nconst form = <FormKit type=\"form\" onSubmit={submitToMailchimp} />",
    ],
  },
  {
    library: FORMKIT,
    patternKey: "call:submitForm:*",
    matches: [
      "import { submitForm } from \"@formkit/vue\"\nsubmitForm(\"registration\")",
    ],
    rejects: [
      "const submitForm = (...parts) => parts\nsubmitForm(\"registration\")",
    ],
  },
]

const REACT_HOOK_FORM = "React Hook Form"

export const reactHookFormFixtures: readonly PatternFixture[] = [
  {
    library: REACT_HOOK_FORM,
    patternKey: "factory:useForm:*",
    matches: [
      "import { useForm } from \"react-hook-form\"\nconst { register, handleSubmit, formState } = useForm()",
    ],
    rejects: [
      "const useForm = (...parts) => parts\nconst { register, handleSubmit, formState } = useForm()",
    ],
  },
  {
    library: REACT_HOOK_FORM,
    patternKey: "call:useWatch:*",
    matches: [
      "import { useWatch } from \"react-hook-form\"\nconst firstName = useWatch({ control, name: \"firstName\" })",
    ],
    rejects: [
      "const useWatch = (...parts) => parts\nconst firstName = useWatch({ control, name: \"firstName\" })",
    ],
  },
]

const REACT_JSONSCHEMA_FORM = "react-jsonschema-form"

export const reactJsonschemaFormFixtures: readonly PatternFixture[] = [
  {
    library: REACT_JSONSCHEMA_FORM,
    patternKey: "element:default:*",
    matches: [
      "import Form from \"@rjsf/core\"\nconst form = <Form schema={schema} validator={validator} onSubmit={save} />",
    ],
    rejects: [
      "const Form = (props) => props.children\nconst form = <Form schema={schema} validator={validator} onSubmit={save} />",
    ],
  },
]

const TANSTACK_FORM = "TanStack Form"

export const tanstackFormFixtures: readonly PatternFixture[] = [
  {
    library: TANSTACK_FORM,
    patternKey: "factory:useForm:*",
    matches: [
      "import { useForm } from \"@tanstack/react-form\"\nconst form = useForm({ defaultValues: { fullName: \"\" }, onSubmit: async ({ value }) => { save(value) } })",
    ],
    rejects: [
      "const useForm = (...parts) => parts\nconst form = useForm({ defaultValues: { fullName: \"\" }, onSubmit: async ({ value }) => { save(value) } })",
    ],
  },
  {
    library: TANSTACK_FORM,
    patternKey: "factory:useForm:*>call:handleSubmit:*",
    matches: [
      "import { useForm } from \"@tanstack/react-form\"\nconst form = useForm({ defaultValues: { fullName: \"\" }, onSubmit: async ({ value }) => { save(value) } })\nform.handleSubmit()",
    ],
    rejects: [
      "const form = makeLocalRegistry()\nform.handleSubmit()",
    ],
  },
]

const VEEVALIDATE = "VeeValidate"

export const veevalidateFixtures: readonly PatternFixture[] = [
  {
    library: VEEVALIDATE,
    patternKey: "factory:useForm:*",
    matches: [
      "import { useForm } from \"vee-validate\"\nconst form = useForm({ validationSchema: schema })",
    ],
    rejects: [
      "const useForm = (...parts) => parts\nconst form = useForm({ validationSchema: schema })",
    ],
  },
  {
    library: VEEVALIDATE,
    patternKey: "factory:useForm:*>call:handleSubmit:*",
    matches: [
      "import { useForm } from \"vee-validate\"\nconst form = useForm({ validationSchema: schema })\nconst onSubmit = form.handleSubmit((values) => { save(values) })",
    ],
    rejects: [
      "const form = makeLocalRegistry()\nconst onSubmit = form.handleSubmit((values) => { save(values) })",
    ],
  },
  {
    library: VEEVALIDATE,
    patternKey: "call:useField:*",
    matches: [
      "import { useField } from \"vee-validate\"\nconst { value, errorMessage } = useField(\"email\", (value) => isEmail(value))",
    ],
    rejects: [
      "const useField = (...parts) => parts\nconst { value, errorMessage } = useField(\"email\", (value) => isEmail(value))",
    ],
  },
]

const VUEFORM = "Vueform"

export const vueformFixtures: readonly PatternFixture[] = [
  {
    library: VUEFORM,
    patternKey: "call:defineConfig:*",
    matches: [
      "import { defineConfig } from \"@vueform/vueform\"\nexport default defineConfig({ theme: vueform, locales: { en }, locale: \"en\" })",
    ],
    rejects: [
      "const defineConfig = (...parts) => parts\nexport default defineConfig({ theme: vueform, locales: { en }, locale: \"en\" })",
    ],
  },
]
