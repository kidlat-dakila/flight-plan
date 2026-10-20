import type { CatalogueLibrary } from "@/catalogue/types"

const VALIDATION = "validation"

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

export const pydanticLibrary: CatalogueLibrary = {
  name: "Pydantic",
  specifiers: ["pydantic"],
  documentedVersion: "2.14",
  category: "validation",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "class",
      name: "BaseModel",
      makes: "validation",
      classifies: "data-model",
      members: [],
      methods: [
        { kind: "call", name: "model_validate", slots: [], makes: "validation" },
        { kind: "call", name: "model_validate_json", slots: [], makes: "validation" },
        { kind: "call", name: "model_validate_strings", slots: [], makes: "validation" },
        { kind: "call", name: "parse_obj", slots: [], makes: "validation" },
        { kind: "call", name: "parse_raw", slots: [], makes: "validation" },
      ],
    },
    {
      kind: "factory",
      name: "TypeAdapter",
      makes: "validation",
      methods: [
        { kind: "call", name: "validate_python", slots: [], makes: "validation" },
        { kind: "call", name: "validate_json", slots: [], makes: "validation" },
        { kind: "call", name: "validate_strings", slots: [], makes: "validation" },
      ],
    },
    { kind: "decorator", name: "field_validator", classifies: VALIDATION },
    { kind: "decorator", name: "model_validator", classifies: VALIDATION },
    { kind: "decorator", name: "validator", classifies: VALIDATION },
    { kind: "decorator", name: "root_validator", classifies: VALIDATION },
    { kind: "decorator", name: "validate_call", makes: "validation" },
  ],
}
