import type { CatalogueLibrary, MethodPattern } from "@/catalogue/types"

export const ajvLibrary: CatalogueLibrary = {
  name: "Ajv",
  specifiers: ["ajv"],
  documentedVersion: "8.20",
  category: "validation",
  type: "fullstack",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "default",
      methods: [
        {
          kind: "factory",
          name: "compile",
          makes: "validation",
          methods: [],
          called: {
            slots: [],
            makes: "validation",
          },
        },
        { kind: "call", name: "validate", slots: [], makes: "validation" },
        { kind: "call", name: "addSchema", slots: [], makes: "validation" },
      ],
    },
  ],
}

export const arktypeLibrary: CatalogueLibrary = {
  name: "ArkType",
  specifiers: ["arktype"],
  documentedVersion: "2.2",
  category: "validation",
  type: "fullstack",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "type",
      makes: "validation",
      methods: [
        { kind: "call", name: "narrow", slots: [{ at: 0, runs: "kept" }], makes: "validation" },
        { kind: "call", name: "pipe", slots: [{ at: 0, runs: "kept" }], makes: "validation" },
      ],
      called: {
        slots: [],
        makes: "validation",
      },
    },
  ],
}

export const expressZodApiLibrary: CatalogueLibrary = {
  name: "Express Zod API",
  specifiers: ["express-zod-api"],
  documentedVersion: "29.8",
  category: "validation",
  type: "backend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "defaultEndpointsFactory.build", slots: [{ at: "handler", runs: "route" }], pathAt: "path", methodAt: "method" },
    { kind: "call", name: "defaultEndpointsFactory.addMiddleware", slots: [{ at: 0, runs: "middleware" }] },
    {
      kind: "factory",
      name: "Middleware",
      slots: [{ at: "handler", runs: "middleware" }],
      methods: [],
    },
    { kind: "call", name: "createConfig", slots: [], makes: "config" },
  ],
}

export const suryLibrary: CatalogueLibrary = {
  name: "Sury",
  specifiers: ["sury"],
  documentedVersion: "11.1",
  category: "validation",
  type: "fullstack",
  language: "javascript",
  patterns: [
    { kind: "call", name: "schema", slots: [], makes: "validation" },
    { kind: "call", name: "parseOrThrow", slots: [], makes: "validation" },
    { kind: "call", name: "object", slots: [], makes: "validation" },
  ],
}

export const typeboxLibrary: CatalogueLibrary = {
  name: "TypeBox",
  specifiers: ["@sinclair/typebox", "@sinclair/typebox/value", "typebox", "typebox/value", "typebox/compile"],
  documentedVersion: "0.34",
  category: "validation",
  type: "fullstack",
  language: "javascript",
  patterns: [
    { kind: "call", name: "Type.Object", slots: [], makes: "validation" },
    { kind: "call", name: "Value.Parse", slots: [], makes: "validation" },
    {
      kind: "factory",
      name: "Compile",
      makes: "validation",
      methods: [
        { kind: "call", name: "Parse", slots: [], makes: "validation" },
      ],
    },
  ],
}

export const typiaLibrary: CatalogueLibrary = {
  name: "Typia",
  specifiers: ["typia"],
  documentedVersion: "15.1",
  category: "validation",
  type: "fullstack",
  language: "javascript",
  patterns: [
    { kind: "call", name: "default.assert", slots: [], makes: "validation" },
    { kind: "call", name: "default.validate", slots: [], makes: "validation" },
    { kind: "call", name: "default.createIs", slots: [], makes: "validation" },
  ],
}

export const valibotLibrary: CatalogueLibrary = {
  name: "Valibot",
  specifiers: ["valibot"],
  documentedVersion: "1.5",
  category: "validation",
  type: "fullstack",
  language: "javascript",
  patterns: [
    { kind: "call", name: "object", slots: [], makes: "validation" },
    { kind: "call", name: "pipe", slots: [], makes: "validation" },
    { kind: "call", name: "parse", slots: [], makes: "validation" },
    { kind: "call", name: "safeParse", slots: [], makes: "validation" },
  ],
}

export const validatorLibrary: CatalogueLibrary = {
  name: "Validator",
  specifiers: ["validator"],
  documentedVersion: "13.15",
  category: "validation",
  type: "fullstack",
  language: "javascript",
  patterns: [
    { kind: "call", name: "default.isEmail", slots: [], makes: "validation" },
    { kind: "call", name: "default.isURL", slots: [], makes: "validation" },
    { kind: "call", name: "default.isLength", slots: [], makes: "validation" },
    { kind: "call", name: "default.escape", slots: [], makes: "validation" },
    { kind: "call", name: "default.normalizeEmail", slots: [], makes: "validation" },
  ],
}

export const vinejsLibrary: CatalogueLibrary = {
  name: "VineJS",
  specifiers: ["@vinejs/vine"],
  documentedVersion: "4.4",
  category: "validation",
  type: "backend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "default.object", slots: [], makes: "validation" },
    {
      kind: "factory",
      name: "default.compile",
      makes: "validation",
      methods: [
        { kind: "call", name: "validate", slots: [], makes: "validation" },
      ],
    },
  ],
}

const ZOD_SCHEMA_METHODS: readonly MethodPattern[] = [
  { kind: "call", name: "parse", slots: [], makes: "validation" },
  { kind: "call", name: "safeParse", slots: [], makes: "validation" },
]

export const zodLibrary: CatalogueLibrary = {
  name: "Zod",
  specifiers: ["zod"],
  documentedVersion: "4.6",
  category: "validation",
  type: "fullstack",
  language: "javascript",
  patterns: [
    { kind: "factory", name: "z.object", makes: "validation", methods: ZOD_SCHEMA_METHODS },
    { kind: "factory", name: "z.string", makes: "validation", methods: ZOD_SCHEMA_METHODS },
  ],
}
