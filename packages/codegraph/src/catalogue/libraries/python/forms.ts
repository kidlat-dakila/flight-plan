import type { CatalogueLibrary, ClassMember } from "@/catalogue/types"

const DJANGO_FORMTOOLS_DONE: readonly ClassMember[] = [{ name: "done", runs: "event" }]

export const deformLibrary: CatalogueLibrary = {
  name: "Deform",
  specifiers: ["deform"],
  documentedVersion: "3.0",
  category: "forms",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "Form",
      methods: [
        { kind: "call", name: "validate", slots: [], makes: "validation" },
        { kind: "call", name: "render", slots: [], classifies: "ui-state" },
      ],
    },
  ],
}

export const djangoCrispyFormsLibrary: CatalogueLibrary = {
  name: "django-crispy-forms",
  specifiers: ["crispy_forms.helper"],
  documentedVersion: "2.7",
  category: "forms",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "FormHelper",
      classifies: "ui-state",
      methods: [],
    },
  ],
}

export const wtformsLibrary: CatalogueLibrary = {
  name: "WTForms",
  specifiers: ["wtforms"],
  documentedVersion: "3.2",
  category: "forms",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "class",
      name: "Form",
      members: [],
      methods: [
        { kind: "call", name: "validate", slots: [], makes: "validation" },
        { kind: "call", name: "populate_obj", slots: [], classifies: "ui-state" },
      ],
    },
  ],
}

export const flaskWtfLibrary: CatalogueLibrary = {
  name: "Flask-WTF",
  specifiers: ["flask_wtf", "flask_wtf.csrf"],
  documentedVersion: "1.3",
  category: "forms",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "class",
      name: "FlaskForm",
      members: [],
      methods: [
        { kind: "call", name: "validate_on_submit", slots: [], makes: "validation" },
      ],
    },
    {
      kind: "factory",
      name: "CSRFProtect",
      classifies: "security",
      methods: [
        { kind: "decorator", name: "exempt", classifies: "security" },
        { kind: "call", name: "protect", slots: [], classifies: "security" },
      ],
    },
  ],
}

export const djangoFormtoolsLibrary: CatalogueLibrary = {
  name: "django-formtools",
  specifiers: ["formtools.wizard.views", "formtools.preview"],
  documentedVersion: "2.7",
  category: "forms",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "class", name: "SessionWizardView", members: DJANGO_FORMTOOLS_DONE, methods: [] },
    { kind: "class", name: "CookieWizardView", members: DJANGO_FORMTOOLS_DONE, methods: [] },
    { kind: "class", name: "FormPreview", members: DJANGO_FORMTOOLS_DONE, methods: [] },
  ],
}
