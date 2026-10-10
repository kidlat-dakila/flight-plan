import type { CatalogueLibrary } from "@/catalogue/types"

export const cerberusLibrary: CatalogueLibrary = {
  name: "Cerberus",
  specifiers: ["cerberus"],
  documentedVersion: "1.3",
  category: "validation",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "Validator",
      makes: "validation",
      methods: [
        { kind: "call", name: "validate", slots: [], makes: "validation" },
      ],
    },
  ],
}

export const colanderLibrary: CatalogueLibrary = {
  name: "Colander",
  specifiers: ["colander"],
  documentedVersion: "2.0",
  category: "validation",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "SchemaNode",
      slots: [{ at: "validator", runs: "kept" }],
      makes: "validation",
      methods: [],
    },
    {
      kind: "class",
      name: "MappingSchema",
      makes: "validation",
      members: [],
      methods: [
        { kind: "call", name: "deserialize", slots: [], makes: "validation" },
      ],
    },
  ],
}

export const jsonschemaLibrary: CatalogueLibrary = {
  name: "jsonschema",
  specifiers: ["jsonschema"],
  documentedVersion: "4.26",
  category: "validation",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "call", name: "validate", slots: [], makes: "validation" },
    {
      kind: "factory",
      name: "Draft202012Validator",
      makes: "validation",
      methods: [
        { kind: "call", name: "validate", slots: [], makes: "validation" },
        { kind: "call", name: "is_valid", slots: [], makes: "validation" },
        { kind: "call", name: "iter_errors", slots: [], makes: "validation" },
      ],
    },
  ],
}

export const schemaLibrary: CatalogueLibrary = {
  name: "schema",
  specifiers: ["schema"],
  documentedVersion: "0.7",
  category: "validation",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "Schema",
      makes: "validation",
      methods: [
        { kind: "call", name: "validate", slots: [], makes: "validation" },
        { kind: "call", name: "is_valid", slots: [], makes: "validation" },
      ],
    },
  ],
}

export const schematicsLibrary: CatalogueLibrary = {
  name: "Schematics",
  specifiers: ["schematics", "schematics.models"],
  documentedVersion: "2.1",
  category: "validation",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "class",
      name: "Model",
      makes: "validation",
      members: [],
      methods: [
        { kind: "call", name: "validate", slots: [], makes: "validation" },
      ],
    },
  ],
}

export const valideerLibrary: CatalogueLibrary = {
  name: "valideer",
  specifiers: ["valideer"],
  documentedVersion: "0.4",
  category: "validation",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "parse",
      makes: "validation",
      methods: [
        { kind: "call", name: "validate", slots: [], makes: "validation" },
        { kind: "call", name: "is_valid", slots: [], makes: "validation" },
      ],
    },
    { kind: "decorator", name: "accepts", makes: "validation" },
  ],
}

export const voluptuousLibrary: CatalogueLibrary = {
  name: "Voluptuous",
  specifiers: ["voluptuous"],
  documentedVersion: "0.16",
  category: "validation",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "Schema",
      makes: "validation",
      methods: [],
      called: {
        slots: [],
        makes: "validation",
      },
    },
  ],
}
