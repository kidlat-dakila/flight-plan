import type { PatternFixture } from "@/catalogue/types"

const CERBERUS = "Cerberus"

export const cerberusFixtures: readonly PatternFixture[] = [
  {
    library: CERBERUS,
    patternKey: "factory:Validator:*",
    matches: [
      "from cerberus import Validator\n\nv = Validator({\"name\": {\"type\": \"string\"}})",
    ],
    rejects: [
      "def Validator(*parts, **options):\n    return parts\n\nv = Validator({\"name\": {\"type\": \"string\"}})",
    ],
  },
  {
    library: CERBERUS,
    patternKey: "factory:Validator:*>call:validate:*",
    matches: [
      "from cerberus import Validator\n\nv = Validator({\"name\": {\"type\": \"string\"}})\n\nok = v.validate({\"name\": \"john doe\"})",
    ],
    rejects: [
      "v = LocalRegistry()\n\nok = v.validate({\"name\": \"john doe\"})",
    ],
  },
]

const COLANDER = "Colander"

export const colanderFixtures: readonly PatternFixture[] = [
  {
    library: COLANDER,
    patternKey: "factory:SchemaNode:*",
    matches: [
      "from colander import SchemaNode\n\nschema = SchemaNode(String(), validator=Range(0, 200))",
    ],
    rejects: [
      "def SchemaNode(*parts, **options):\n    return parts\n\nschema = SchemaNode(String(), validator=Range(0, 200))",
    ],
  },
  {
    library: COLANDER,
    patternKey: "class:MappingSchema:*",
    matches: [
      "from colander import MappingSchema\n\nclass Person(MappingSchema):\n    name = SchemaNode(String())",
    ],
    rejects: [
      "class MappingSchema:\n    pass\n\nclass Person(MappingSchema):\n    name = SchemaNode(String())",
    ],
  },
  {
    library: COLANDER,
    patternKey: "class:MappingSchema:*>call:deserialize:*",
    matches: [
      "from colander import MappingSchema\n\nclass Person(MappingSchema):\n    name = SchemaNode(String())\n\nschema = Person()\ndeserialized = schema.deserialize(cstruct)",
    ],
    rejects: [
      "schema = LocalRegistry()\n\nschema = Person()\ndeserialized = schema.deserialize(cstruct)",
    ],
  },
]

const JSONSCHEMA = "jsonschema"

export const jsonschemaFixtures: readonly PatternFixture[] = [
  {
    library: JSONSCHEMA,
    patternKey: "call:validate:*",
    matches: [
      "from jsonschema import validate\n\nvalidate(instance={\"name\": \"Eggs\", \"price\": 34.99}, schema=schema)",
    ],
    rejects: [
      "def validate(*parts, **options):\n    return parts\n\nvalidate(instance={\"name\": \"Eggs\", \"price\": 34.99}, schema=schema)",
    ],
  },
  {
    library: JSONSCHEMA,
    patternKey: "factory:Draft202012Validator:*",
    matches: [
      "from jsonschema import Draft202012Validator\n\nvalidator = Draft202012Validator(schema)",
    ],
    rejects: [
      "def Draft202012Validator(*parts, **options):\n    return parts\n\nvalidator = Draft202012Validator(schema)",
    ],
  },
  {
    library: JSONSCHEMA,
    patternKey: "factory:Draft202012Validator:*>call:validate:*",
    matches: [
      "from jsonschema import Draft202012Validator\n\nvalidator = Draft202012Validator(schema)\n\nvalidator.validate(instance)",
    ],
    rejects: [
      "validator = LocalRegistry()\n\nvalidator.validate(instance)",
    ],
  },
  {
    library: JSONSCHEMA,
    patternKey: "factory:Draft202012Validator:*>call:is_valid:*",
    matches: [
      "from jsonschema import Draft202012Validator\n\nvalidator = Draft202012Validator(schema)\n\nvalidator.is_valid(instance)",
    ],
    rejects: [
      "validator = LocalRegistry()\n\nvalidator.is_valid(instance)",
    ],
  },
  {
    library: JSONSCHEMA,
    patternKey: "factory:Draft202012Validator:*>call:iter_errors:*",
    matches: [
      "from jsonschema import Draft202012Validator\n\nvalidator = Draft202012Validator(schema)\n\nvalidator.iter_errors(instance)",
    ],
    rejects: [
      "validator = LocalRegistry()\n\nvalidator.iter_errors(instance)",
    ],
  },
]

const SCHEMA = "schema"

export const schemaFixtures: readonly PatternFixture[] = [
  {
    library: SCHEMA,
    patternKey: "factory:Schema:*",
    matches: [
      "from schema import Schema\n\ns = Schema({\"name\": And(str, len), Optional(\"age\"): Use(int)})",
    ],
    rejects: [
      "def Schema(*parts, **options):\n    return parts\n\ns = Schema({\"name\": And(str, len), Optional(\"age\"): Use(int)})",
    ],
  },
  {
    library: SCHEMA,
    patternKey: "factory:Schema:*>call:validate:*",
    matches: [
      "from schema import Schema\n\ns = Schema({\"name\": And(str, len), Optional(\"age\"): Use(int)})\n\ns.validate(data)",
    ],
    rejects: [
      "s = LocalRegistry()\n\ns.validate(data)",
    ],
  },
  {
    library: SCHEMA,
    patternKey: "factory:Schema:*>call:is_valid:*",
    matches: [
      "from schema import Schema\n\ns = Schema({\"name\": And(str, len), Optional(\"age\"): Use(int)})\n\ns.is_valid(data)",
    ],
    rejects: [
      "s = LocalRegistry()\n\ns.is_valid(data)",
    ],
  },
]

const SCHEMATICS = "Schematics"

export const schematicsFixtures: readonly PatternFixture[] = [
  {
    library: SCHEMATICS,
    patternKey: "class:Model:*",
    matches: [
      "from schematics.models import Model\n\nclass Person(Model):\n    name = StringType(required=True)",
    ],
    rejects: [
      "class Model:\n    pass\n\nclass Person(Model):\n    name = StringType(required=True)",
    ],
  },
  {
    library: SCHEMATICS,
    patternKey: "class:Model:*>call:validate:*",
    matches: [
      "from schematics.models import Model\n\nclass Person(Model):\n    name = StringType(required=True)\n\nperson = Person({\"name\": \"Joe Strummer\"})\nperson.validate()",
    ],
    rejects: [
      "person = LocalRegistry()\n\nperson = Person({\"name\": \"Joe Strummer\"})\nperson.validate()",
    ],
  },
]

const VALIDEER = "valideer"

export const valideerFixtures: readonly PatternFixture[] = [
  {
    library: VALIDEER,
    patternKey: "factory:parse:*",
    matches: [
      "from valideer import parse\n\nvalidator = parse({\"+name\": \"string\", \"price\": \"number\"})",
    ],
    rejects: [
      "def parse(*parts, **options):\n    return parts\n\nvalidator = parse({\"+name\": \"string\", \"price\": \"number\"})",
    ],
  },
  {
    library: VALIDEER,
    patternKey: "factory:parse:*>call:validate:*",
    matches: [
      "from valideer import parse\n\nvalidator = parse({\"+name\": \"string\", \"price\": \"number\"})\n\nvalidator.validate(product)",
    ],
    rejects: [
      "validator = LocalRegistry()\n\nvalidator.validate(product)",
    ],
  },
  {
    library: VALIDEER,
    patternKey: "factory:parse:*>call:is_valid:*",
    matches: [
      "from valideer import parse\n\nvalidator = parse({\"+name\": \"string\", \"price\": \"number\"})\n\nvalidator.is_valid(product)",
    ],
    rejects: [
      "validator = LocalRegistry()\n\nvalidator.is_valid(product)",
    ],
  },
  {
    library: VALIDEER,
    patternKey: "decorator:accepts:*",
    matches: [
      "from valideer import accepts\n\n@accepts(product=product_schema)\ndef get_total_price(product):\n    return product[\"price\"]",
    ],
    rejects: [
      "def accepts(*parts, **options):\n    return parts\n\n@accepts(product=product_schema)\ndef get_total_price(product):\n    return product[\"price\"]",
    ],
  },
]

const VOLUPTUOUS = "Voluptuous"

export const voluptuousFixtures: readonly PatternFixture[] = [
  {
    library: VOLUPTUOUS,
    patternKey: "factory:Schema:*",
    matches: [
      "from voluptuous import Schema\n\nschema = Schema({Required(\"q\"): All(str, Length(min=1))})",
    ],
    rejects: [
      "def Schema(*parts, **options):\n    return parts\n\nschema = Schema({Required(\"q\"): All(str, Length(min=1))})",
    ],
  },
  {
    library: VOLUPTUOUS,
    patternKey: "factory:Schema:*>called",
    matches: [
      "from voluptuous import Schema\n\nschema = Schema({Required(\"q\"): All(str, Length(min=1))})\n\ndata = schema({\"q\": \"hello\"})",
    ],
    rejects: [
      "schema = LocalRegistry()\n\ndata = schema({\"q\": \"hello\"})",
    ],
  },
]
