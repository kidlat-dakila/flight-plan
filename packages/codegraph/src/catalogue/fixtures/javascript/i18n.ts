import type { PatternFixture } from "@/catalogue/types"

const I18NEXT = "i18next"

export const i18nextFixtures: readonly PatternFixture[] = [
  {
    library: I18NEXT,
    patternKey: "call:default.t:*",
    matches: [
      "import i18next from \"i18next\"\nconst title = i18next.t(\"home.title\")",
    ],
    rejects: [
      "const i18next = makeLocalRegistry()\nconst title = i18next.t(\"home.title\")",
    ],
  },
  {
    library: I18NEXT,
    patternKey: "call:default.init:*",
    matches: [
      "import i18next from \"i18next\"\nawait i18next.init({ lng: \"en\", resources })",
    ],
    rejects: [
      "const i18next = makeLocalRegistry()\nawait i18next.init({ lng: \"en\", resources })",
    ],
  },
  {
    library: I18NEXT,
    patternKey: "call:default.use:*",
    matches: [
      "import i18next from \"i18next\"\ni18next.use(initReactI18next)",
    ],
    rejects: [
      "const i18next = makeLocalRegistry()\ni18next.use(initReactI18next)",
    ],
  },
  {
    library: I18NEXT,
    patternKey: "call:default.changeLanguage:*",
    matches: [
      "import i18next from \"i18next\"\nawait i18next.changeLanguage(\"de\")",
    ],
    rejects: [
      "const i18next = makeLocalRegistry()\nawait i18next.changeLanguage(\"de\")",
    ],
  },
  {
    library: I18NEXT,
    patternKey: "call:t:*",
    matches: [
      "import { t } from \"i18next\"\nconst title = t(\"home.title\")",
    ],
    rejects: [
      "const t = (key) => key\nconst title = t(\"home.title\")",
    ],
  },
  {
    library: I18NEXT,
    patternKey: "call:changeLanguage:*",
    matches: [
      "import { changeLanguage } from \"i18next\"\nawait changeLanguage(\"de\")",
    ],
    rejects: [
      "const changeLanguage = async (language) => language\nawait changeLanguage(\"de\")",
    ],
  },
  {
    library: I18NEXT,
    patternKey: "factory:createInstance:*",
    matches: [
      "import { createInstance } from \"i18next\"\nconst instance = createInstance({ lng: \"en\" })",
    ],
    rejects: [
      "const createInstance = (options) => options\nconst instance = createInstance({ lng: \"en\" })",
    ],
  },
  {
    library: I18NEXT,
    patternKey: "factory:createInstance:*>call:t:*",
    matches: [
      "import { createInstance } from \"i18next\"\nconst instance = createInstance()\ninstance.t(\"home.title\")",
    ],
    rejects: [
      "const instance = makeLocalRegistry()\ninstance.t(\"home.title\")",
    ],
  },
  {
    library: I18NEXT,
    patternKey: "factory:createInstance:*>call:init:*",
    matches: [
      "import { createInstance } from \"i18next\"\nconst instance = createInstance()\nawait instance.init({ lng: \"en\" })",
    ],
    rejects: [
      "const instance = makeLocalRegistry()\nawait instance.init({ lng: \"en\" })",
    ],
  },
  {
    library: I18NEXT,
    patternKey: "factory:createInstance:*>call:use:*",
    matches: [
      "import { createInstance } from \"i18next\"\nconst instance = createInstance()\ninstance.use(initReactI18next)",
    ],
    rejects: [
      "const instance = makeLocalRegistry()\ninstance.use(initReactI18next)",
    ],
  },
  {
    library: I18NEXT,
    patternKey: "factory:createInstance:*>call:changeLanguage:*",
    matches: [
      "import { createInstance } from \"i18next\"\nconst instance = createInstance()\nawait instance.changeLanguage(\"de\")",
    ],
    rejects: [
      "const instance = makeLocalRegistry()\nawait instance.changeLanguage(\"de\")",
    ],
  },
  {
    library: I18NEXT,
    patternKey: "factory:useTranslation:*",
    matches: [
      "import { useTranslation } from \"react-i18next\"\nconst translation = useTranslation(\"common\")",
    ],
    rejects: [
      "const useTranslation = (namespace) => namespace\nconst translation = useTranslation(\"common\")",
    ],
  },
  {
    library: I18NEXT,
    patternKey: "factory:useTranslation:*>call:t:*",
    matches: [
      "import { useTranslation } from \"react-i18next\"\nconst { t } = useTranslation()\nconst title = t(\"home.title\")",
    ],
    rejects: [
      "const { t } = makeLocalRegistry()\nconst title = t(\"home.title\")",
    ],
  },
  {
    library: I18NEXT,
    patternKey: "factory:useTranslation:*>call:changeLanguage:*",
    matches: [
      "import { useTranslation } from \"react-i18next\"\nconst { i18n } = useTranslation()\ni18n.changeLanguage(\"de\")",
    ],
    rejects: [
      "const { i18n } = makeLocalRegistry()\ni18n.changeLanguage(\"de\")",
    ],
  },
  {
    library: I18NEXT,
    patternKey: "call:withTranslation:*",
    matches: [
      "import { withTranslation } from \"react-i18next\"\nexport default withTranslation()(Greeting)",
    ],
    rejects: [
      "const withTranslation = () => (component) => component\nexport default withTranslation()(Greeting)",
    ],
  },
  {
    library: I18NEXT,
    patternKey: "element:Trans:*",
    matches: [
      "import { Trans } from \"react-i18next\"\nconst text = <Trans i18nKey=\"welcome\" values={{ name }} />",
    ],
    rejects: [
      "const Trans = (props) => props.children\nconst text = <Trans i18nKey=\"welcome\" values={{ name }} />",
    ],
  },
  {
    library: I18NEXT,
    patternKey: "element:I18nextProvider:*",
    matches: [
      "import { I18nextProvider } from \"react-i18next\"\nconst app = <I18nextProvider i18n={i18n}><App /></I18nextProvider>",
    ],
    rejects: [
      "const I18nextProvider = (props) => props.children\nconst app = <I18nextProvider i18n={i18n}><App /></I18nextProvider>",
    ],
  },
]

const LINGUI = "Lingui"

export const linguiFixtures: readonly PatternFixture[] = [
  {
    library: LINGUI,
    patternKey: "call:i18n._:*",
    matches: [
      "import { i18n } from \"@lingui/core\"\nconst title = i18n._(\"home.title\")",
    ],
    rejects: [
      "const i18n = makeLocalRegistry()\nconst title = i18n._(\"home.title\")",
    ],
  },
  {
    library: LINGUI,
    patternKey: "call:i18n.t:*",
    matches: [
      "import { i18n } from \"@lingui/core\"\nconst title = i18n.t({ id: \"home.title\" })",
    ],
    rejects: [
      "const i18n = makeLocalRegistry()\nconst title = i18n.t({ id: \"home.title\" })",
    ],
  },
  {
    library: LINGUI,
    patternKey: "call:i18n.activate:*",
    matches: [
      "import { i18n } from \"@lingui/core\"\ni18n.activate(\"de\")",
    ],
    rejects: [
      "const i18n = makeLocalRegistry()\ni18n.activate(\"de\")",
    ],
  },
  {
    library: LINGUI,
    patternKey: "call:i18n.load:*",
    matches: [
      "import { i18n } from \"@lingui/core\"\ni18n.load(\"de\", messages)",
    ],
    rejects: [
      "const i18n = makeLocalRegistry()\ni18n.load(\"de\", messages)",
    ],
  },
  {
    library: LINGUI,
    patternKey: "call:i18n.loadAndActivate:*",
    matches: [
      "import { i18n } from \"@lingui/core\"\ni18n.loadAndActivate({ locale: \"de\", messages })",
    ],
    rejects: [
      "const i18n = makeLocalRegistry()\ni18n.loadAndActivate({ locale: \"de\", messages })",
    ],
  },
  {
    library: LINGUI,
    patternKey: "factory:setupI18n:*",
    matches: [
      "import { setupI18n } from \"@lingui/core\"\nconst i18n = setupI18n({ locale: \"en\", messages: { en: messages } })",
    ],
    rejects: [
      "const setupI18n = (options) => options\nconst i18n = setupI18n({ locale: \"en\", messages: { en: messages } })",
    ],
  },
  {
    library: LINGUI,
    patternKey: "factory:setupI18n:*>call:_:*",
    matches: [
      "import { setupI18n } from \"@lingui/core\"\nconst local = setupI18n()\nconst title = local._(\"home.title\")",
    ],
    rejects: [
      "const local = makeLocalRegistry()\nconst title = local._(\"home.title\")",
    ],
  },
  {
    library: LINGUI,
    patternKey: "factory:setupI18n:*>call:activate:*",
    matches: [
      "import { setupI18n } from \"@lingui/core\"\nconst local = setupI18n()\nlocal.activate(\"de\")",
    ],
    rejects: [
      "const local = makeLocalRegistry()\nlocal.activate(\"de\")",
    ],
  },
  {
    library: LINGUI,
    patternKey: "factory:setupI18n:*>call:load:*",
    matches: [
      "import { setupI18n } from \"@lingui/core\"\nconst local = setupI18n()\nlocal.load(\"de\", messages)",
    ],
    rejects: [
      "const local = makeLocalRegistry()\nlocal.load(\"de\", messages)",
    ],
  },
  {
    library: LINGUI,
    patternKey: "call:t:*",
    matches: [
      "import { t } from \"@lingui/core/macro\"\nconst greeting = t`Hello`",
    ],
    rejects: [
      "const t = (parts) => parts.join(\"\")\nconst greeting = t`Hello`",
    ],
  },
  {
    library: LINGUI,
    patternKey: "call:msg:*",
    matches: [
      "import { msg } from \"@lingui/core/macro\"\nconst greeting = msg`Hello`",
    ],
    rejects: [
      "const msg = (parts) => parts.join(\"\")\nconst greeting = msg`Hello`",
    ],
  },
  {
    library: LINGUI,
    patternKey: "call:defineMessage:*",
    matches: [
      "import { defineMessage } from \"@lingui/core/macro\"\nconst greeting = defineMessage({ message: \"Hello\" })",
    ],
    rejects: [
      "const defineMessage = (descriptor) => descriptor\nconst greeting = defineMessage({ message: \"Hello\" })",
    ],
  },
  {
    library: LINGUI,
    patternKey: "call:plural:*",
    matches: [
      "import { plural } from \"@lingui/core/macro\"\nconst label = plural(count, { one: \"# book\", other: \"# books\" })",
    ],
    rejects: [
      "const plural = (value, choices) => choices.other\nconst label = plural(count, { one: \"# book\", other: \"# books\" })",
    ],
  },
  {
    library: LINGUI,
    patternKey: "call:select:*",
    matches: [
      "import { select } from \"@lingui/core/macro\"\nconst label = select(gender, { male: \"he\", female: \"she\", other: \"they\" })",
    ],
    rejects: [
      "const select = (value, choices) => choices.other\nconst label = select(gender, { male: \"he\", female: \"she\", other: \"they\" })",
    ],
  },
  {
    library: LINGUI,
    patternKey: "call:selectOrdinal:*",
    matches: [
      "import { selectOrdinal } from \"@lingui/core/macro\"\nconst label = selectOrdinal(place, { one: \"#st\", two: \"#nd\", few: \"#rd\", other: \"#th\" })",
    ],
    rejects: [
      "const selectOrdinal = (value, choices) => choices.other\nconst label = selectOrdinal(place, { one: \"#st\", two: \"#nd\", few: \"#rd\", other: \"#th\" })",
    ],
  },
  {
    library: LINGUI,
    patternKey: "factory:useLingui:*",
    matches: [
      "import { useLingui } from \"@lingui/react/macro\"\nconst lingui = useLingui()",
    ],
    rejects: [
      "const useLingui = () => ({})\nconst lingui = useLingui()",
    ],
  },
  {
    library: LINGUI,
    patternKey: "factory:useLingui:*>call:t:*",
    matches: [
      "import { useLingui } from \"@lingui/react/macro\"\nconst { t } = useLingui()\nconst greeting = t`Hello`",
    ],
    rejects: [
      "const { t } = makeLocalRegistry()\nconst greeting = t`Hello`",
    ],
  },
  {
    library: LINGUI,
    patternKey: "factory:useLingui:*>call:_:*",
    matches: [
      "import { useLingui } from \"@lingui/react\"\nconst { _ } = useLingui()\nconst greeting = _(\"home.greeting\")",
    ],
    rejects: [
      "const { _ } = makeLocalRegistry()\nconst greeting = _(\"home.greeting\")",
    ],
  },
  {
    library: LINGUI,
    patternKey: "element:Trans:*",
    matches: [
      "import { Trans } from \"@lingui/react/macro\"\nconst view = <Trans>Hello {name}</Trans>",
    ],
    rejects: [
      "const Trans = (props) => props.children\nconst view = <Trans>Hello {name}</Trans>",
    ],
  },
  {
    library: LINGUI,
    patternKey: "element:Plural:*",
    matches: [
      "import { Plural } from \"@lingui/react/macro\"\nconst view = <Plural value={count} one=\"# book\" other=\"# books\" />",
    ],
    rejects: [
      "const Plural = (props) => props.children\nconst view = <Plural value={count} one=\"# book\" other=\"# books\" />",
    ],
  },
  {
    library: LINGUI,
    patternKey: "element:Select:*",
    matches: [
      "import { Select } from \"@lingui/react/macro\"\nconst view = <Select value={gender} male=\"he\" female=\"she\" other=\"they\" />",
    ],
    rejects: [
      "const Select = (props) => props.children\nconst view = <Select value={gender} male=\"he\" female=\"she\" other=\"they\" />",
    ],
  },
  {
    library: LINGUI,
    patternKey: "element:SelectOrdinal:*",
    matches: [
      "import { SelectOrdinal } from \"@lingui/react/macro\"\nconst view = <SelectOrdinal value={place} one=\"#st\" other=\"#th\" />",
    ],
    rejects: [
      "const SelectOrdinal = (props) => props.children\nconst view = <SelectOrdinal value={place} one=\"#st\" other=\"#th\" />",
    ],
  },
  {
    library: LINGUI,
    patternKey: "element:I18nProvider:*",
    matches: [
      "import { I18nProvider } from \"@lingui/react\"\nconst view = <I18nProvider i18n={i18n}><App /></I18nProvider>",
    ],
    rejects: [
      "const I18nProvider = (props) => props.children\nconst view = <I18nProvider i18n={i18n}><App /></I18nProvider>",
    ],
  },
]

const NEXT_INTL = "next-intl"

export const nextIntlFixtures: readonly PatternFixture[] = [
  {
    library: NEXT_INTL,
    patternKey: "factory:useTranslations:*",
    matches: [
      "import { useTranslations } from \"next-intl\"\nconst t = useTranslations(\"Home\")",
    ],
    rejects: [
      "const useTranslations = async (namespace) => (key) => key\nconst t = useTranslations(\"Home\")",
    ],
  },
  {
    library: NEXT_INTL,
    patternKey: "factory:useTranslations:*>called",
    matches: [
      "import { useTranslations } from \"next-intl\"\nconst t = useTranslations(\"Home\")\nconst title = t(\"title\")",
    ],
    rejects: [
      "const useTranslations = async (namespace) => (key) => key\nconst t = useTranslations(\"Home\")\nconst title = t(\"title\")",
    ],
  },
  {
    library: NEXT_INTL,
    patternKey: "factory:useTranslations:*>call:rich:*",
    matches: [
      "import { useTranslations } from \"next-intl\"\nconst t = useTranslations(\"Home\")\nconst value = t.rich(\"intro\", { strong: (chunks) => chunks })",
    ],
    rejects: [
      "const t = makeLocalRegistry()\nconst value = t.rich(\"intro\", { strong: (chunks) => chunks })",
    ],
  },
  {
    library: NEXT_INTL,
    patternKey: "factory:useTranslations:*>call:markup:*",
    matches: [
      "import { useTranslations } from \"next-intl\"\nconst t = useTranslations(\"Home\")\nconst value = t.markup(\"intro\", { strong: (chunks) => chunks })",
    ],
    rejects: [
      "const t = makeLocalRegistry()\nconst value = t.markup(\"intro\", { strong: (chunks) => chunks })",
    ],
  },
  {
    library: NEXT_INTL,
    patternKey: "factory:useTranslations:*>call:raw:*",
    matches: [
      "import { useTranslations } from \"next-intl\"\nconst t = useTranslations(\"Home\")\nconst value = t.raw(\"content\")",
    ],
    rejects: [
      "const t = makeLocalRegistry()\nconst value = t.raw(\"content\")",
    ],
  },
  {
    library: NEXT_INTL,
    patternKey: "factory:useTranslations:*>call:has:*",
    matches: [
      "import { useTranslations } from \"next-intl\"\nconst t = useTranslations(\"Home\")\nconst value = t.has(\"title\")",
    ],
    rejects: [
      "const t = makeLocalRegistry()\nconst value = t.has(\"title\")",
    ],
  },
  {
    library: NEXT_INTL,
    patternKey: "factory:getTranslations:*",
    matches: [
      "import { getTranslations } from \"next-intl/server\"\nconst t = await getTranslations(\"Home\")",
    ],
    rejects: [
      "const getTranslations = async (namespace) => (key) => key\nconst t = await getTranslations(\"Home\")",
    ],
  },
  {
    library: NEXT_INTL,
    patternKey: "factory:getTranslations:*>called",
    matches: [
      "import { getTranslations } from \"next-intl/server\"\nconst t = await getTranslations(\"Home\")\nconst title = t(\"title\")",
    ],
    rejects: [
      "const getTranslations = async (namespace) => (key) => key\nconst t = await getTranslations(\"Home\")\nconst title = t(\"title\")",
    ],
  },
  {
    library: NEXT_INTL,
    patternKey: "factory:getTranslations:*>call:rich:*",
    matches: [
      "import { getTranslations } from \"next-intl/server\"\nconst t = await getTranslations(\"Home\")\nconst value = t.rich(\"intro\", { strong: (chunks) => chunks })",
    ],
    rejects: [
      "const t = makeLocalRegistry()\nconst value = t.rich(\"intro\", { strong: (chunks) => chunks })",
    ],
  },
  {
    library: NEXT_INTL,
    patternKey: "factory:getTranslations:*>call:markup:*",
    matches: [
      "import { getTranslations } from \"next-intl/server\"\nconst t = await getTranslations(\"Home\")\nconst value = t.markup(\"intro\", { strong: (chunks) => chunks })",
    ],
    rejects: [
      "const t = makeLocalRegistry()\nconst value = t.markup(\"intro\", { strong: (chunks) => chunks })",
    ],
  },
  {
    library: NEXT_INTL,
    patternKey: "factory:getTranslations:*>call:raw:*",
    matches: [
      "import { getTranslations } from \"next-intl/server\"\nconst t = await getTranslations(\"Home\")\nconst value = t.raw(\"content\")",
    ],
    rejects: [
      "const t = makeLocalRegistry()\nconst value = t.raw(\"content\")",
    ],
  },
  {
    library: NEXT_INTL,
    patternKey: "factory:getTranslations:*>call:has:*",
    matches: [
      "import { getTranslations } from \"next-intl/server\"\nconst t = await getTranslations(\"Home\")\nconst value = t.has(\"title\")",
    ],
    rejects: [
      "const t = makeLocalRegistry()\nconst value = t.has(\"title\")",
    ],
  },
  {
    library: NEXT_INTL,
    patternKey: "call:useFormatter:*",
    matches: [
      "import { useFormatter } from \"next-intl\"\nconst format = useFormatter()",
    ],
    rejects: [
      "const useFormatter = async (...parts) => parts\nconst format = useFormatter()",
    ],
  },
  {
    library: NEXT_INTL,
    patternKey: "call:getFormatter:*",
    matches: [
      "import { getFormatter } from \"next-intl/server\"\nconst format = await getFormatter()",
    ],
    rejects: [
      "const getFormatter = async (...parts) => parts\nconst format = await getFormatter()",
    ],
  },
  {
    library: NEXT_INTL,
    patternKey: "call:useLocale:*",
    matches: [
      "import { useLocale } from \"next-intl\"\nconst locale = useLocale()",
    ],
    rejects: [
      "const useLocale = async (...parts) => parts\nconst locale = useLocale()",
    ],
  },
  {
    library: NEXT_INTL,
    patternKey: "call:getLocale:*",
    matches: [
      "import { getLocale } from \"next-intl/server\"\nconst locale = await getLocale()",
    ],
    rejects: [
      "const getLocale = async (...parts) => parts\nconst locale = await getLocale()",
    ],
  },
  {
    library: NEXT_INTL,
    patternKey: "call:useMessages:*",
    matches: [
      "import { useMessages } from \"next-intl\"\nconst messages = useMessages()",
    ],
    rejects: [
      "const useMessages = async (...parts) => parts\nconst messages = useMessages()",
    ],
  },
  {
    library: NEXT_INTL,
    patternKey: "call:getMessages:*",
    matches: [
      "import { getMessages } from \"next-intl/server\"\nconst messages = await getMessages()",
    ],
    rejects: [
      "const getMessages = async (...parts) => parts\nconst messages = await getMessages()",
    ],
  },
  {
    library: NEXT_INTL,
    patternKey: "call:setRequestLocale:*",
    matches: [
      "import { setRequestLocale } from \"next-intl/server\"\nsetRequestLocale(locale)",
    ],
    rejects: [
      "const setRequestLocale = async (...parts) => parts\nsetRequestLocale(locale)",
    ],
  },
  {
    library: NEXT_INTL,
    patternKey: "call:getRequestConfig:*",
    matches: [
      "import { getRequestConfig } from \"next-intl/server\"\nexport default getRequestConfig(async ({ requestLocale }) => ({ locale: await requestLocale }))",
    ],
    rejects: [
      "const getRequestConfig = (load) => load\nexport default getRequestConfig(async ({ requestLocale }) => ({ locale: await requestLocale }))",
    ],
  },
  {
    library: NEXT_INTL,
    patternKey: "element:NextIntlClientProvider:*",
    matches: [
      "import { NextIntlClientProvider } from \"next-intl\"\nconst page = <NextIntlClientProvider>{children}</NextIntlClientProvider>",
    ],
    rejects: [
      "const NextIntlClientProvider = (props) => props.children\nconst page = <NextIntlClientProvider>{children}</NextIntlClientProvider>",
    ],
  },
]

const REACT_INTL = "React Intl"

export const reactIntlFixtures: readonly PatternFixture[] = [
  {
    library: REACT_INTL,
    patternKey: "factory:useIntl:*",
    matches: [
      "import { useIntl } from \"react-intl\"\nconst intl = useIntl()",
    ],
    rejects: [
      "const useIntl = () => ({})\nconst intl = useIntl()",
    ],
  },
  {
    library: REACT_INTL,
    patternKey: "factory:useIntl:*>call:formatMessage:*",
    matches: [
      "import { useIntl } from \"react-intl\"\nconst intl = useIntl()\nconst text = intl.formatMessage({ id: \"home.title\" })",
    ],
    rejects: [
      "const intl = makeLocalRegistry()\nconst text = intl.formatMessage({ id: \"home.title\" })",
    ],
  },
  {
    library: REACT_INTL,
    patternKey: "factory:useIntl:*>call:formatNumber:*",
    matches: [
      "import { useIntl } from \"react-intl\"\nconst intl = useIntl()\nconst text = intl.formatNumber(total, { style: \"currency\", currency: \"EUR\" })",
    ],
    rejects: [
      "const intl = makeLocalRegistry()\nconst text = intl.formatNumber(total, { style: \"currency\", currency: \"EUR\" })",
    ],
  },
  {
    library: REACT_INTL,
    patternKey: "factory:useIntl:*>call:formatDate:*",
    matches: [
      "import { useIntl } from \"react-intl\"\nconst intl = useIntl()\nconst text = intl.formatDate(Date.now())",
    ],
    rejects: [
      "const intl = makeLocalRegistry()\nconst text = intl.formatDate(Date.now())",
    ],
  },
  {
    library: REACT_INTL,
    patternKey: "factory:useIntl:*>call:formatTime:*",
    matches: [
      "import { useIntl } from \"react-intl\"\nconst intl = useIntl()\nconst text = intl.formatTime(Date.now())",
    ],
    rejects: [
      "const intl = makeLocalRegistry()\nconst text = intl.formatTime(Date.now())",
    ],
  },
  {
    library: REACT_INTL,
    patternKey: "factory:useIntl:*>call:formatRelativeTime:*",
    matches: [
      "import { useIntl } from \"react-intl\"\nconst intl = useIntl()\nconst text = intl.formatRelativeTime(-1, \"day\")",
    ],
    rejects: [
      "const intl = makeLocalRegistry()\nconst text = intl.formatRelativeTime(-1, \"day\")",
    ],
  },
  {
    library: REACT_INTL,
    patternKey: "factory:useIntl:*>call:formatList:*",
    matches: [
      "import { useIntl } from \"react-intl\"\nconst intl = useIntl()\nconst text = intl.formatList([\"a\", \"b\"])",
    ],
    rejects: [
      "const intl = makeLocalRegistry()\nconst text = intl.formatList([\"a\", \"b\"])",
    ],
  },
  {
    library: REACT_INTL,
    patternKey: "factory:createIntl:*",
    matches: [
      "import { createIntl } from \"react-intl\"\nconst intl = createIntl({ locale: \"en\", messages })",
    ],
    rejects: [
      "const createIntl = (options) => options\nconst intl = createIntl({ locale: \"en\", messages })",
    ],
  },
  {
    library: REACT_INTL,
    patternKey: "factory:createIntl:*>call:formatMessage:*",
    matches: [
      "import { createIntl } from \"react-intl\"\nconst intl = createIntl({ locale: \"en\", messages })\nconst text = intl.formatMessage({ id: \"home.title\" })",
    ],
    rejects: [
      "const intl = makeLocalRegistry()\nconst text = intl.formatMessage({ id: \"home.title\" })",
    ],
  },
  {
    library: REACT_INTL,
    patternKey: "factory:createIntl:*>call:formatNumber:*",
    matches: [
      "import { createIntl } from \"react-intl\"\nconst intl = createIntl({ locale: \"en\", messages })\nconst text = intl.formatNumber(total, { style: \"currency\", currency: \"EUR\" })",
    ],
    rejects: [
      "const intl = makeLocalRegistry()\nconst text = intl.formatNumber(total, { style: \"currency\", currency: \"EUR\" })",
    ],
  },
  {
    library: REACT_INTL,
    patternKey: "factory:createIntl:*>call:formatDate:*",
    matches: [
      "import { createIntl } from \"react-intl\"\nconst intl = createIntl({ locale: \"en\", messages })\nconst text = intl.formatDate(Date.now())",
    ],
    rejects: [
      "const intl = makeLocalRegistry()\nconst text = intl.formatDate(Date.now())",
    ],
  },
  {
    library: REACT_INTL,
    patternKey: "factory:createIntl:*>call:formatTime:*",
    matches: [
      "import { createIntl } from \"react-intl\"\nconst intl = createIntl({ locale: \"en\", messages })\nconst text = intl.formatTime(Date.now())",
    ],
    rejects: [
      "const intl = makeLocalRegistry()\nconst text = intl.formatTime(Date.now())",
    ],
  },
  {
    library: REACT_INTL,
    patternKey: "factory:createIntl:*>call:formatRelativeTime:*",
    matches: [
      "import { createIntl } from \"react-intl\"\nconst intl = createIntl({ locale: \"en\", messages })\nconst text = intl.formatRelativeTime(-1, \"day\")",
    ],
    rejects: [
      "const intl = makeLocalRegistry()\nconst text = intl.formatRelativeTime(-1, \"day\")",
    ],
  },
  {
    library: REACT_INTL,
    patternKey: "factory:createIntl:*>call:formatList:*",
    matches: [
      "import { createIntl } from \"react-intl\"\nconst intl = createIntl({ locale: \"en\", messages })\nconst text = intl.formatList([\"a\", \"b\"])",
    ],
    rejects: [
      "const intl = makeLocalRegistry()\nconst text = intl.formatList([\"a\", \"b\"])",
    ],
  },
  {
    library: REACT_INTL,
    patternKey: "call:defineMessages:*",
    matches: [
      "import { defineMessages } from \"react-intl\"\nconst messages = defineMessages({ title: { id: \"home.title\", defaultMessage: \"Home\" } })",
    ],
    rejects: [
      "const defineMessages = (messages) => messages\nconst messages = defineMessages({ title: { id: \"home.title\", defaultMessage: \"Home\" } })",
    ],
  },
  {
    library: REACT_INTL,
    patternKey: "call:defineMessage:*",
    matches: [
      "import { defineMessage } from \"react-intl\"\nconst title = defineMessage({ id: \"home.title\", defaultMessage: \"Home\" })",
    ],
    rejects: [
      "const defineMessage = (message) => message\nconst title = defineMessage({ id: \"home.title\", defaultMessage: \"Home\" })",
    ],
  },
  {
    library: REACT_INTL,
    patternKey: "call:injectIntl:*",
    matches: [
      "import { injectIntl } from \"react-intl\"\nexport default injectIntl(Greeting)",
    ],
    rejects: [
      "const injectIntl = (component) => component\nexport default injectIntl(Greeting)",
    ],
  },
  {
    library: REACT_INTL,
    patternKey: "element:FormattedMessage:*",
    matches: [
      "import { FormattedMessage } from \"react-intl\"\nconst view = <FormattedMessage id=\"home.title\" defaultMessage=\"Home\" />",
    ],
    rejects: [
      "const FormattedMessage = (props) => props.children\nconst view = <FormattedMessage id=\"home.title\" defaultMessage=\"Home\" />",
    ],
  },
  {
    library: REACT_INTL,
    patternKey: "element:FormattedNumber:*",
    matches: [
      "import { FormattedNumber } from \"react-intl\"\nconst view = <FormattedNumber value={total} style=\"currency\" currency=\"EUR\" />",
    ],
    rejects: [
      "const FormattedNumber = (props) => props.children\nconst view = <FormattedNumber value={total} style=\"currency\" currency=\"EUR\" />",
    ],
  },
  {
    library: REACT_INTL,
    patternKey: "element:FormattedDate:*",
    matches: [
      "import { FormattedDate } from \"react-intl\"\nconst view = <FormattedDate value={createdAt} />",
    ],
    rejects: [
      "const FormattedDate = (props) => props.children\nconst view = <FormattedDate value={createdAt} />",
    ],
  },
  {
    library: REACT_INTL,
    patternKey: "element:FormattedTime:*",
    matches: [
      "import { FormattedTime } from \"react-intl\"\nconst view = <FormattedTime value={createdAt} />",
    ],
    rejects: [
      "const FormattedTime = (props) => props.children\nconst view = <FormattedTime value={createdAt} />",
    ],
  },
  {
    library: REACT_INTL,
    patternKey: "element:FormattedPlural:*",
    matches: [
      "import { FormattedPlural } from \"react-intl\"\nconst view = <FormattedPlural value={count} one=\"message\" other=\"messages\" />",
    ],
    rejects: [
      "const FormattedPlural = (props) => props.children\nconst view = <FormattedPlural value={count} one=\"message\" other=\"messages\" />",
    ],
  },
  {
    library: REACT_INTL,
    patternKey: "element:FormattedRelativeTime:*",
    matches: [
      "import { FormattedRelativeTime } from \"react-intl\"\nconst view = <FormattedRelativeTime value={-1} unit=\"day\" />",
    ],
    rejects: [
      "const FormattedRelativeTime = (props) => props.children\nconst view = <FormattedRelativeTime value={-1} unit=\"day\" />",
    ],
  },
  {
    library: REACT_INTL,
    patternKey: "element:FormattedList:*",
    matches: [
      "import { FormattedList } from \"react-intl\"\nconst view = <FormattedList type=\"conjunction\" value={names} />",
    ],
    rejects: [
      "const FormattedList = (props) => props.children\nconst view = <FormattedList type=\"conjunction\" value={names} />",
    ],
  },
  {
    library: REACT_INTL,
    patternKey: "element:IntlProvider:*",
    matches: [
      "import { IntlProvider } from \"react-intl\"\nconst view = <IntlProvider locale=\"en\" messages={messages}><App /></IntlProvider>",
    ],
    rejects: [
      "const IntlProvider = (props) => props.children\nconst view = <IntlProvider locale=\"en\" messages={messages}><App /></IntlProvider>",
    ],
  },
]

const VUE_I18N = "vue-i18n"

export const vueI18nFixtures: readonly PatternFixture[] = [
  {
    library: VUE_I18N,
    patternKey: "factory:createI18n:*",
    matches: [
      "import { createI18n } from \"vue-i18n\"\nconst i18n = createI18n({ locale: \"en\", messages })",
    ],
    rejects: [
      "const createI18n = (options) => options\nconst i18n = createI18n({ locale: \"en\", messages })",
    ],
  },
  {
    library: VUE_I18N,
    patternKey: "factory:createI18n:*>call:t:*",
    matches: [
      "import { createI18n } from \"vue-i18n\"\nconst i18n = createI18n({ locale: \"en\", messages })\nconst title = i18n.global.t(\"home.title\")",
    ],
    rejects: [
      "const i18n = makeLocalRegistry()\nconst title = i18n.global.t(\"home.title\")",
    ],
  },
  {
    library: VUE_I18N,
    patternKey: "factory:createI18n:*>call:setLocaleMessage:*",
    matches: [
      "import { createI18n } from \"vue-i18n\"\nconst i18n = createI18n({ locale: \"en\", messages })\ni18n.global.setLocaleMessage(\"de\", german)",
    ],
    rejects: [
      "const i18n = makeLocalRegistry()\ni18n.global.setLocaleMessage(\"de\", german)",
    ],
  },
  {
    library: VUE_I18N,
    patternKey: "factory:useI18n:*",
    matches: [
      "import { useI18n } from \"vue-i18n\"\nconst i18n = useI18n()",
    ],
    rejects: [
      "const useI18n = () => ({})\nconst i18n = useI18n()",
    ],
  },
  {
    library: VUE_I18N,
    patternKey: "factory:useI18n:*>call:t:*",
    matches: [
      "import { useI18n } from \"vue-i18n\"\nconst { t } = useI18n()\nconst value = t(\"home.title\")",
    ],
    rejects: [
      "const { t } = makeLocalRegistry()\nconst value = t(\"home.title\")",
    ],
  },
  {
    library: VUE_I18N,
    patternKey: "factory:useI18n:*>call:rt:*",
    matches: [
      "import { useI18n } from \"vue-i18n\"\nconst { rt } = useI18n()\nconst value = rt(message)",
    ],
    rejects: [
      "const { rt } = makeLocalRegistry()\nconst value = rt(message)",
    ],
  },
  {
    library: VUE_I18N,
    patternKey: "factory:useI18n:*>call:te:*",
    matches: [
      "import { useI18n } from \"vue-i18n\"\nconst { te } = useI18n()\nconst value = te(\"home.title\")",
    ],
    rejects: [
      "const { te } = makeLocalRegistry()\nconst value = te(\"home.title\")",
    ],
  },
  {
    library: VUE_I18N,
    patternKey: "factory:useI18n:*>call:tm:*",
    matches: [
      "import { useI18n } from \"vue-i18n\"\nconst { tm } = useI18n()\nconst value = tm(\"home\")",
    ],
    rejects: [
      "const { tm } = makeLocalRegistry()\nconst value = tm(\"home\")",
    ],
  },
  {
    library: VUE_I18N,
    patternKey: "factory:useI18n:*>call:d:*",
    matches: [
      "import { useI18n } from \"vue-i18n\"\nconst { d } = useI18n()\nconst value = d(new Date(), \"short\")",
    ],
    rejects: [
      "const { d } = makeLocalRegistry()\nconst value = d(new Date(), \"short\")",
    ],
  },
  {
    library: VUE_I18N,
    patternKey: "factory:useI18n:*>call:n:*",
    matches: [
      "import { useI18n } from \"vue-i18n\"\nconst { n } = useI18n()\nconst value = n(total, \"currency\")",
    ],
    rejects: [
      "const { n } = makeLocalRegistry()\nconst value = n(total, \"currency\")",
    ],
  },
]
