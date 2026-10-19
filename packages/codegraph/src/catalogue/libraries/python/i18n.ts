import type { CallPattern, CatalogueLibrary, LocationSetting } from "@/catalogue/types"

const I18N = "i18n"

const BABEL_MAPPING_FILE: LocationSetting = { classification: I18N, files: [{ glob: "**/babel.cfg" }], keys: [], marks: "file" }

const GETTEXT_METHODS: readonly CallPattern[] = [
  { kind: "call", name: "gettext", slots: [], classifies: I18N },
  { kind: "call", name: "ngettext", slots: [], classifies: I18N },
  { kind: "call", name: "pgettext", slots: [], classifies: I18N },
  { kind: "call", name: "npgettext", slots: [], classifies: I18N },
]

export const babelLibrary: CatalogueLibrary = {
  name: "Babel",
  specifiers: ["babel.support"],
  documentedVersion: "2.17",
  category: "i18n",
  type: "backend",
  language: "python",
  locations: [
    BABEL_MAPPING_FILE,
    {
      classification: I18N,
      files: [{ glob: "setup.cfg" }],
      keys: [
        { key: "compile_catalog.directory", holds: "folders" },
        { key: "init_catalog.output_dir", holds: "folders" },
        { key: "update_catalog.output_dir", holds: "folders" },
        { key: "extract_messages.mapping_file", holds: "files" },
        { key: "extract_messages.output_file", holds: "files" },
      ],
    },
  ],
  patterns: [
    { kind: "factory", name: "Translations.load", classifies: I18N, methods: GETTEXT_METHODS },
  ],
}

const FASTAPI_BABEL_APP_FILES = "**/{main,app,babel,config,settings}.py"

export const fastapiBabelLibrary: CatalogueLibrary = {
  name: "fastapi-babel",
  specifiers: ["fastapi_babel"],
  documentedVersion: "1.0",
  category: "i18n",
  type: "backend",
  language: "python",
  locations: [
    BABEL_MAPPING_FILE,
    {
      classification: I18N,
      files: [{ glob: FASTAPI_BABEL_APP_FILES }],
      keys: [
        { key: "BabelConfigs(BABEL_TRANSLATION_DIRECTORY)", holds: "folders" },
        { key: "BabelConfigs(BABEL_CONFIG_FILE)", holds: "files" },
      ],
    },
  ],
  patterns: [
    { kind: "call", name: "_", slots: [], classifies: I18N },
    { kind: "call", name: "lazy_gettext", slots: [], classifies: I18N },
    { kind: "factory", name: "BabelConfigs", classifies: I18N, methods: [] },
    { kind: "factory", name: "Babel", classifies: I18N, methods: [] },
  ],
}

const FLASK_BABEL_APP_FILES = "**/{app,main,wsgi,config,settings,extensions}.py"
const FLASK_BABEL_TRANSLATION_DIRECTORIES = "translations"
const FLASK_BABEL_DIRECTORY_SEPARATOR = ";"

export const flaskBabelLibrary: CatalogueLibrary = {
  name: "Flask-Babel",
  specifiers: ["flask_babel"],
  documentedVersion: "4.0",
  category: "i18n",
  type: "backend",
  language: "python",
  locations: [
    BABEL_MAPPING_FILE,
    {
      classification: I18N,
      files: [{ glob: FLASK_BABEL_APP_FILES }],
      keys: [
        {
          key: "BABEL_TRANSLATION_DIRECTORIES",
          holds: "folders",
          separator: FLASK_BABEL_DIRECTORY_SEPARATOR,
          default: [FLASK_BABEL_TRANSLATION_DIRECTORIES],
          unlessRead: ["update(BABEL_TRANSLATION_DIRECTORIES)", "Babel(default_translation_directories)", "init_app(default_translation_directories)"],
        },
        { key: "update(BABEL_TRANSLATION_DIRECTORIES)", holds: "folders", separator: FLASK_BABEL_DIRECTORY_SEPARATOR },
        { key: "Babel(default_translation_directories)", holds: "folders" },
        { key: "init_app(default_translation_directories)", holds: "folders" },
      ],
    },
  ],
  patterns: [
    ...GETTEXT_METHODS,
    { kind: "call", name: "_", slots: [], classifies: I18N },
    { kind: "call", name: "lazy_gettext", slots: [], classifies: I18N },
    { kind: "call", name: "lazy_ngettext", slots: [], classifies: I18N },
    { kind: "call", name: "lazy_pgettext", slots: [], classifies: I18N },
    { kind: "call", name: "force_locale", slots: [], classifies: I18N },
    { kind: "call", name: "refresh", slots: [], classifies: I18N },
    { kind: "call", name: "get_locale", slots: [], classifies: I18N },
    {
      kind: "factory",
      name: "Babel",
      classifies: I18N,
      methods: [{ kind: "call", name: "init_app", slots: [], classifies: I18N }],
    },
  ],
}

export const fluentRuntimeLibrary: CatalogueLibrary = {
  name: "fluent.runtime",
  specifiers: ["fluent.runtime"],
  documentedVersion: "0.4",
  category: "i18n",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "FluentLocalization",
      classifies: I18N,
      methods: [{ kind: "call", name: "format_value", slots: [], classifies: I18N }],
    },
    { kind: "factory", name: "FluentResourceLoader", classifies: I18N, methods: [] },
    {
      kind: "factory",
      name: "FluentBundle",
      classifies: I18N,
      methods: [
        { kind: "call", name: "add_resource", slots: [], classifies: I18N },
        { kind: "call", name: "get_message", slots: [], classifies: I18N },
        { kind: "call", name: "format_pattern", slots: [], classifies: I18N },
      ],
    },
    { kind: "call", name: "FluentResource", slots: [], classifies: I18N },
  ],
}

export const pythonI18nLibrary: CatalogueLibrary = {
  name: "python-i18n",
  specifiers: ["i18n"],
  documentedVersion: "0.3",
  category: "i18n",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "call", name: "t", slots: [], classifies: I18N },
    { kind: "call", name: "set", slots: [], classifies: I18N },
    { kind: "call", name: "add_translation", slots: [], classifies: I18N },
    { kind: "call", name: "load_path.append", slots: [], classifies: I18N },
  ],
}
