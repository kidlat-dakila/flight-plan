import type { CallPattern, CatalogueLibrary } from "@/catalogue/types"

const I18N = "i18n"

const I18NEXT_HTTP_BACKEND_LOAD_PATH = "/locales/{{lng}}/{{ns}}.json"

const I18NEXT_INSTANCE_METHODS: readonly CallPattern[] = [
  { kind: "call", name: "t", slots: [], classifies: I18N },
  { kind: "call", name: "init", slots: [], classifies: I18N },
  { kind: "call", name: "use", slots: [], classifies: I18N },
  { kind: "call", name: "changeLanguage", slots: [], classifies: I18N },
]

export const i18nextLibrary: CatalogueLibrary = {
  name: "i18next",
  specifiers: ["i18next", "react-i18next"],
  documentedVersion: "26.5",
  category: "i18n",
  type: "frontend",
  language: "javascript",
  locations: [
    {
      classification: I18N,
      files: [
        { glob: "**/i18n.{js,ts,mjs}", base: "package" },
        { glob: "**/i18n/index.{js,ts}", base: "package" },
        { glob: "**/i18n/config.{js,ts}", base: "package" },
      ],
      keys: [{ key: "init(0).backend.loadPath", holds: "url-globs", default: [I18NEXT_HTTP_BACKEND_LOAD_PATH] }],
    },
  ],
  patterns: [
    { kind: "call", name: "default.t", slots: [], classifies: I18N },
    { kind: "call", name: "default.init", slots: [], classifies: I18N },
    { kind: "call", name: "default.use", slots: [], classifies: I18N },
    { kind: "call", name: "default.changeLanguage", slots: [], classifies: I18N },
    { kind: "call", name: "t", slots: [], classifies: I18N },
    { kind: "call", name: "changeLanguage", slots: [], classifies: I18N },
    { kind: "factory", name: "createInstance", classifies: I18N, methods: I18NEXT_INSTANCE_METHODS },
    {
      kind: "factory",
      name: "useTranslation",
      classifies: I18N,
      methods: [
        { kind: "call", name: "t", slots: [], classifies: I18N },
        { kind: "call", name: "changeLanguage", slots: [], classifies: I18N },
      ],
    },
    { kind: "call", name: "withTranslation", slots: [], classifies: I18N },
    { kind: "element", name: "Trans", slots: [], classifies: I18N },
    { kind: "element", name: "I18nextProvider", slots: [], classifies: I18N },
  ],
}

const LINGUI_CATALOG_PATH = "<rootDir>/locale/{locale}/messages"

export const linguiLibrary: CatalogueLibrary = {
  name: "Lingui",
  specifiers: ["@lingui/core", "@lingui/react", "@lingui/core/macro", "@lingui/react/macro"],
  documentedVersion: "6.10",
  category: "i18n",
  type: "frontend",
  language: "javascript",
  locations: [
    {
      classification: I18N,
      files: [{ glob: "lingui.config.{js,cjs,ts,mjs}" }, { glob: ".linguirc.{json,js,ts}" }, { glob: "package.json", under: "lingui" }],
      keys: [{ key: "catalogs.path", holds: "file-folders", default: [LINGUI_CATALOG_PATH] }],
    },
  ],
  patterns: [
    { kind: "call", name: "i18n._", slots: [], classifies: I18N },
    { kind: "call", name: "i18n.t", slots: [], classifies: I18N },
    { kind: "call", name: "i18n.activate", slots: [], classifies: I18N },
    { kind: "call", name: "i18n.load", slots: [], classifies: I18N },
    { kind: "call", name: "i18n.loadAndActivate", slots: [], classifies: I18N },
    {
      kind: "factory",
      name: "setupI18n",
      classifies: I18N,
      methods: [
        { kind: "call", name: "_", slots: [], classifies: I18N },
        { kind: "call", name: "activate", slots: [], classifies: I18N },
        { kind: "call", name: "load", slots: [], classifies: I18N },
      ],
    },
    { kind: "call", name: "t", slots: [], classifies: I18N },
    { kind: "call", name: "msg", slots: [], classifies: I18N },
    { kind: "call", name: "defineMessage", slots: [], classifies: I18N },
    { kind: "call", name: "plural", slots: [], classifies: I18N },
    { kind: "call", name: "select", slots: [], classifies: I18N },
    { kind: "call", name: "selectOrdinal", slots: [], classifies: I18N },
    {
      kind: "factory",
      name: "useLingui",
      classifies: I18N,
      methods: [
        { kind: "call", name: "t", slots: [], classifies: I18N },
        { kind: "call", name: "_", slots: [], classifies: I18N },
      ],
    },
    { kind: "element", name: "Trans", slots: [], classifies: I18N },
    { kind: "element", name: "Plural", slots: [], classifies: I18N },
    { kind: "element", name: "Select", slots: [], classifies: I18N },
    { kind: "element", name: "SelectOrdinal", slots: [], classifies: I18N },
    { kind: "element", name: "I18nProvider", slots: [], classifies: I18N },
  ],
}

const NEXT_INTL_TRANSLATOR_METHODS: readonly CallPattern[] = [
  { kind: "call", name: "rich", slots: [], classifies: I18N },
  { kind: "call", name: "markup", slots: [], classifies: I18N },
  { kind: "call", name: "raw", slots: [], classifies: I18N },
  { kind: "call", name: "has", slots: [], classifies: I18N },
]

export const nextIntlLibrary: CatalogueLibrary = {
  name: "next-intl",
  specifiers: ["next-intl", "next-intl/server"],
  documentedVersion: "4.14",
  category: "i18n",
  type: "fullstack",
  language: "javascript",
  locations: [
    {
      classification: I18N,
      files: [{ glob: "**/i18n/request.{ts,js}" }],
      keys: [{ key: "import(0)", holds: "globs", default: ["messages/**"], defaultBase: "package" }],
    },
  ],
  patterns: [
    { kind: "factory", name: "useTranslations", classifies: I18N, methods: NEXT_INTL_TRANSLATOR_METHODS, called: { slots: [], classifies: I18N } },
    { kind: "factory", name: "getTranslations", classifies: I18N, methods: NEXT_INTL_TRANSLATOR_METHODS, called: { slots: [], classifies: I18N } },
    { kind: "call", name: "useFormatter", slots: [], classifies: I18N },
    { kind: "call", name: "getFormatter", slots: [], classifies: I18N },
    { kind: "call", name: "useLocale", slots: [], classifies: I18N },
    { kind: "call", name: "getLocale", slots: [], classifies: I18N },
    { kind: "call", name: "useMessages", slots: [], classifies: I18N },
    { kind: "call", name: "getMessages", slots: [], classifies: I18N },
    { kind: "call", name: "setRequestLocale", slots: [], classifies: I18N },
    { kind: "call", name: "getRequestConfig", slots: [], classifies: I18N },
    { kind: "element", name: "NextIntlClientProvider", slots: [], classifies: I18N },
  ],
}

const REACT_INTL_FORMAT_METHODS: readonly CallPattern[] = [
  { kind: "call", name: "formatMessage", slots: [], classifies: I18N },
  { kind: "call", name: "formatNumber", slots: [], classifies: I18N },
  { kind: "call", name: "formatDate", slots: [], classifies: I18N },
  { kind: "call", name: "formatTime", slots: [], classifies: I18N },
  { kind: "call", name: "formatRelativeTime", slots: [], classifies: I18N },
  { kind: "call", name: "formatList", slots: [], classifies: I18N },
]

export const reactIntlLibrary: CatalogueLibrary = {
  name: "React Intl",
  specifiers: ["react-intl"],
  documentedVersion: "12.1",
  category: "i18n",
  type: "frontend",
  language: "javascript",
  patterns: [
    { kind: "factory", name: "useIntl", classifies: I18N, methods: REACT_INTL_FORMAT_METHODS },
    { kind: "factory", name: "createIntl", classifies: I18N, methods: REACT_INTL_FORMAT_METHODS },
    { kind: "call", name: "defineMessages", slots: [], classifies: I18N },
    { kind: "call", name: "defineMessage", slots: [], classifies: I18N },
    { kind: "call", name: "injectIntl", slots: [], classifies: I18N },
    { kind: "element", name: "FormattedMessage", slots: [], classifies: I18N },
    { kind: "element", name: "FormattedNumber", slots: [], classifies: I18N },
    { kind: "element", name: "FormattedDate", slots: [], classifies: I18N },
    { kind: "element", name: "FormattedTime", slots: [], classifies: I18N },
    { kind: "element", name: "FormattedPlural", slots: [], classifies: I18N },
    { kind: "element", name: "FormattedRelativeTime", slots: [], classifies: I18N },
    { kind: "element", name: "FormattedList", slots: [], classifies: I18N },
    { kind: "element", name: "IntlProvider", slots: [], classifies: I18N },
  ],
}

export const vueI18nLibrary: CatalogueLibrary = {
  name: "vue-i18n",
  specifiers: ["vue-i18n"],
  documentedVersion: "11.4",
  category: "i18n",
  type: "frontend",
  language: "javascript",
  locations: [
    {
      classification: I18N,
      files: [{ glob: "vite.config.{js,ts,mjs,cjs,mts,cts}" }],
      keys: [{ key: "VueI18nPlugin(0).include", holds: "globs" }],
    },
  ],
  patterns: [
    {
      kind: "factory",
      name: "createI18n",
      classifies: I18N,
      methods: [
        { kind: "call", name: "t", slots: [], classifies: I18N },
        { kind: "call", name: "setLocaleMessage", slots: [], classifies: I18N },
      ],
    },
    {
      kind: "factory",
      name: "useI18n",
      classifies: I18N,
      methods: [
        { kind: "call", name: "t", slots: [], classifies: I18N },
        { kind: "call", name: "rt", slots: [], classifies: I18N },
        { kind: "call", name: "te", slots: [], classifies: I18N },
        { kind: "call", name: "tm", slots: [], classifies: I18N },
        { kind: "call", name: "d", slots: [], classifies: I18N },
        { kind: "call", name: "n", slots: [], classifies: I18N },
      ],
    },
  ],
}
