import type { CatalogueLibrary } from "@/catalogue/types"

export const configobjLibrary: CatalogueLibrary = {
  name: "ConfigObj",
  specifiers: ["configobj"],
  documentedVersion: "5.0",
  category: "config",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "ConfigObj",
      makes: "config",
      methods: [
        { kind: "call", name: "validate", slots: [], makes: "config" },
        { kind: "call", name: "write", slots: [], makes: "config" },
      ],
    },
  ],
}

export const hydraLibrary: CatalogueLibrary = {
  name: "Hydra",
  specifiers: ["hydra"],
  documentedVersion: "1.3",
  category: "config",
  type: "backend",
  language: "python",
  locations: [
    {
      classification: "config",
      files: [{ glob: "**/{main,app,run,train,cli}.py" }],
      keys: [{ key: "main(config_path)", holds: "folders" }],
    },
  ],
  patterns: [
    { kind: "decorator", name: "main", runs: "command", makes: "config" },
    { kind: "call", name: "compose", slots: [], makes: "config" },
    { kind: "call", name: "initialize", slots: [], makes: "config" },
  ],
}

export const pythonDecoupleLibrary: CatalogueLibrary = {
  name: "python-decouple",
  specifiers: ["decouple"],
  documentedVersion: "3.8",
  category: "config",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "call", name: "config", slots: [], makes: "config" },
    {
      kind: "factory",
      name: "Config",
      methods: [],
      called: {
        slots: [],
        makes: "config",
      },
    },
  ],
}

export const pythonDotenvLibrary: CatalogueLibrary = {
  name: "python-dotenv",
  specifiers: ["dotenv"],
  documentedVersion: "1.2",
  category: "config",
  type: "backend",
  language: "python",
  locations: [
    {
      classification: "config",
      files: [{ glob: "**/{settings,config,app,main,manage,wsgi,asgi}.py" }],
      keys: [
        { key: "load_dotenv(dotenv_path)", holds: "files" },
        { key: "load_dotenv(0)", holds: "files" },
      ],
    },
  ],
  patterns: [
    { kind: "call", name: "load_dotenv", slots: [], makes: "config" },
    { kind: "call", name: "dotenv_values", slots: [], makes: "config" },
  ],
}

export const dynaconfLibrary: CatalogueLibrary = {
  name: "Dynaconf",
  specifiers: ["dynaconf"],
  documentedVersion: "3.3",
  category: "config",
  type: "backend",
  language: "python",
  locations: [
    {
      classification: "config",
      files: [{ glob: "**/{config,settings,app}.py" }],
      keys: [
        { key: "Dynaconf(settings_files)", holds: "files" },
        { key: "Dynaconf(settings_file)", holds: "files" },
        { key: "FlaskDynaconf(settings_files)", holds: "files" },
      ],
    },
  ],
  patterns: [
    {
      kind: "factory",
      name: "Dynaconf",
      makes: "config",
      methods: [
        { kind: "call", name: "get", slots: [], makes: "config" },
      ],
    },
    { kind: "call", name: "FlaskDynaconf", slots: [], makes: "config" },
    { kind: "call", name: "Validator", slots: [], makes: "validation" },
  ],
}
