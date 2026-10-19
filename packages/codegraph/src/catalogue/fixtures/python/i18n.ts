import type { PatternFixture } from "@/catalogue/types"

const BABEL = "Babel"

export const babelFixtures: readonly PatternFixture[] = [
  {
    library: BABEL,
    patternKey: "factory:Translations.load:*",
    matches: [
      "from babel.support import Translations\n\ntranslations = Translations.load(\"translations\", [\"de\"])",
    ],
    rejects: [
      "Translations = LocalRegistry()\n\ntranslations = Translations.load(\"translations\", [\"de\"])",
    ],
  },
  {
    library: BABEL,
    patternKey: "factory:Translations.load:*>call:gettext:*",
    matches: [
      "from babel.support import Translations\n\ntranslations = Translations.load(\"translations\", [\"de\"])\ntext = translations.gettext(\"Hello\")",
    ],
    rejects: [
      "translations = LocalRegistry()\ntext = translations.gettext(\"Hello\")",
    ],
  },
  {
    library: BABEL,
    patternKey: "factory:Translations.load:*>call:ngettext:*",
    matches: [
      "from babel.support import Translations\n\ntranslations = Translations.load(\"translations\", [\"de\"])\ntext = translations.ngettext(\"%(num)d apple\", \"%(num)d apples\", count)",
    ],
    rejects: [
      "translations = LocalRegistry()\ntext = translations.ngettext(\"%(num)d apple\", \"%(num)d apples\", count)",
    ],
  },
  {
    library: BABEL,
    patternKey: "factory:Translations.load:*>call:pgettext:*",
    matches: [
      "from babel.support import Translations\n\ntranslations = Translations.load(\"translations\", [\"de\"])\ntext = translations.pgettext(\"menu\", \"Open\")",
    ],
    rejects: [
      "translations = LocalRegistry()\ntext = translations.pgettext(\"menu\", \"Open\")",
    ],
  },
  {
    library: BABEL,
    patternKey: "factory:Translations.load:*>call:npgettext:*",
    matches: [
      "from babel.support import Translations\n\ntranslations = Translations.load(\"translations\", [\"de\"])\ntext = translations.npgettext(\"cart\", \"%(num)d item\", \"%(num)d items\", count)",
    ],
    rejects: [
      "translations = LocalRegistry()\ntext = translations.npgettext(\"cart\", \"%(num)d item\", \"%(num)d items\", count)",
    ],
  },
]

const FASTAPI_BABEL = "fastapi-babel"

export const fastapiBabelFixtures: readonly PatternFixture[] = [
  {
    library: FASTAPI_BABEL,
    patternKey: "call:_:*",
    matches: [
      "from fastapi_babel import _\n\ntext = _(\"Hello World\")",
    ],
    rejects: [
      "def _(*parts, **options):\n    return parts\n\ntext = _(\"Hello World\")",
    ],
  },
  {
    library: FASTAPI_BABEL,
    patternKey: "call:lazy_gettext:*",
    matches: [
      "from fastapi_babel import lazy_gettext\n\ntext = lazy_gettext(\"Hello World\")",
    ],
    rejects: [
      "def lazy_gettext(*parts, **options):\n    return parts\n\ntext = lazy_gettext(\"Hello World\")",
    ],
  },
  {
    library: FASTAPI_BABEL,
    patternKey: "factory:BabelConfigs:*",
    matches: [
      "from fastapi_babel import BabelConfigs\n\nconfigs = BabelConfigs(ROOT_DIR=__file__, BABEL_DEFAULT_LOCALE=\"en\", BABEL_TRANSLATION_DIRECTORY=\"lang\")",
    ],
    rejects: [
      "def BabelConfigs(*parts, **options):\n    return parts\n\nconfigs = BabelConfigs(ROOT_DIR=__file__, BABEL_DEFAULT_LOCALE=\"en\", BABEL_TRANSLATION_DIRECTORY=\"lang\")",
    ],
  },
  {
    library: FASTAPI_BABEL,
    patternKey: "factory:Babel:*",
    matches: [
      "from fastapi_babel import Babel\n\nbabel = Babel(configs=configs)",
    ],
    rejects: [
      "def Babel(*parts, **options):\n    return parts\n\nbabel = Babel(configs=configs)",
    ],
  },
]

const FLASK_BABEL = "Flask-Babel"

export const flaskBabelFixtures: readonly PatternFixture[] = [
  {
    library: FLASK_BABEL,
    patternKey: "call:gettext:*",
    matches: [
      "from flask_babel import gettext\n\ntext = gettext(\"Hello\")",
    ],
    rejects: [
      "def gettext(*parts, **options):\n    return parts\n\ntext = gettext(\"Hello\")",
    ],
  },
  {
    library: FLASK_BABEL,
    patternKey: "call:ngettext:*",
    matches: [
      "from flask_babel import ngettext\n\ntext = ngettext(\"%(num)d apple\", \"%(num)d apples\", count)",
    ],
    rejects: [
      "def ngettext(*parts, **options):\n    return parts\n\ntext = ngettext(\"%(num)d apple\", \"%(num)d apples\", count)",
    ],
  },
  {
    library: FLASK_BABEL,
    patternKey: "call:pgettext:*",
    matches: [
      "from flask_babel import pgettext\n\ntext = pgettext(\"menu\", \"Open\")",
    ],
    rejects: [
      "def pgettext(*parts, **options):\n    return parts\n\ntext = pgettext(\"menu\", \"Open\")",
    ],
  },
  {
    library: FLASK_BABEL,
    patternKey: "call:npgettext:*",
    matches: [
      "from flask_babel import npgettext\n\ntext = npgettext(\"cart\", \"%(num)d item\", \"%(num)d items\", count)",
    ],
    rejects: [
      "def npgettext(*parts, **options):\n    return parts\n\ntext = npgettext(\"cart\", \"%(num)d item\", \"%(num)d items\", count)",
    ],
  },
  {
    library: FLASK_BABEL,
    patternKey: "call:_:*",
    matches: [
      "from flask_babel import _\n\nvalue = _(\"Hello\")",
    ],
    rejects: [
      "def _(*parts, **options):\n    return parts\n\nvalue = _(\"Hello\")",
    ],
  },
  {
    library: FLASK_BABEL,
    patternKey: "call:lazy_gettext:*",
    matches: [
      "from flask_babel import lazy_gettext\n\nvalue = lazy_gettext(\"Hello\")",
    ],
    rejects: [
      "def lazy_gettext(*parts, **options):\n    return parts\n\nvalue = lazy_gettext(\"Hello\")",
    ],
  },
  {
    library: FLASK_BABEL,
    patternKey: "call:lazy_ngettext:*",
    matches: [
      "from flask_babel import lazy_ngettext\n\nvalue = lazy_ngettext(\"%(num)d apple\", \"%(num)d apples\", count)",
    ],
    rejects: [
      "def lazy_ngettext(*parts, **options):\n    return parts\n\nvalue = lazy_ngettext(\"%(num)d apple\", \"%(num)d apples\", count)",
    ],
  },
  {
    library: FLASK_BABEL,
    patternKey: "call:lazy_pgettext:*",
    matches: [
      "from flask_babel import lazy_pgettext\n\nvalue = lazy_pgettext(\"menu\", \"Open\")",
    ],
    rejects: [
      "def lazy_pgettext(*parts, **options):\n    return parts\n\nvalue = lazy_pgettext(\"menu\", \"Open\")",
    ],
  },
  {
    library: FLASK_BABEL,
    patternKey: "call:refresh:*",
    matches: [
      "from flask_babel import refresh\n\nvalue = refresh()",
    ],
    rejects: [
      "def refresh(*parts, **options):\n    return parts\n\nvalue = refresh()",
    ],
  },
  {
    library: FLASK_BABEL,
    patternKey: "call:get_locale:*",
    matches: [
      "from flask_babel import get_locale\n\nvalue = get_locale()",
    ],
    rejects: [
      "def get_locale(*parts, **options):\n    return parts\n\nvalue = get_locale()",
    ],
  },
  {
    library: FLASK_BABEL,
    patternKey: "call:force_locale:*",
    matches: [
      "from flask_babel import force_locale\n\nwith force_locale(\"en_US\"):\n    send_email(user)",
    ],
    rejects: [
      "def force_locale(*parts, **options):\n    return parts\n\nwith force_locale(\"en_US\"):\n    send_email(user)",
    ],
  },
  {
    library: FLASK_BABEL,
    patternKey: "factory:Babel:*",
    matches: [
      "from flask_babel import Babel\n\nbabel = Babel(app, locale_selector=get_locale)",
    ],
    rejects: [
      "def Babel(*parts, **options):\n    return parts\n\nbabel = Babel(app, locale_selector=get_locale)",
    ],
  },
  {
    library: FLASK_BABEL,
    patternKey: "factory:Babel:*>call:init_app:*",
    matches: [
      "from flask_babel import Babel\n\nbabel = Babel()\nbabel.init_app(app, locale_selector=get_locale)",
    ],
    rejects: [
      "babel = LocalRegistry()\nbabel.init_app(app, locale_selector=get_locale)",
    ],
  },
]

const FLUENT_RUNTIME = "fluent.runtime"

export const fluentRuntimeFixtures: readonly PatternFixture[] = [
  {
    library: FLUENT_RUNTIME,
    patternKey: "factory:FluentLocalization:*",
    matches: [
      "from fluent.runtime import FluentLocalization\n\nl10n = FluentLocalization([\"de\", \"en-US\"], [\"main.ftl\"], loader)",
    ],
    rejects: [
      "def FluentLocalization(*parts, **options):\n    return parts\n\nl10n = FluentLocalization([\"de\", \"en-US\"], [\"main.ftl\"], loader)",
    ],
  },
  {
    library: FLUENT_RUNTIME,
    patternKey: "factory:FluentLocalization:*>call:format_value:*",
    matches: [
      "from fluent.runtime import FluentLocalization\n\nl10n = FluentLocalization([\"de\", \"en-US\"], [\"main.ftl\"], loader)\nval = l10n.format_value(\"my-first-string\")",
    ],
    rejects: [
      "l10n = LocalRegistry()\nval = l10n.format_value(\"my-first-string\")",
    ],
  },
  {
    library: FLUENT_RUNTIME,
    patternKey: "factory:FluentResourceLoader:*",
    matches: [
      "from fluent.runtime import FluentResourceLoader\n\nloader = FluentResourceLoader(\"l10n/{locale}\")",
    ],
    rejects: [
      "def FluentResourceLoader(*parts, **options):\n    return parts\n\nloader = FluentResourceLoader(\"l10n/{locale}\")",
    ],
  },
  {
    library: FLUENT_RUNTIME,
    patternKey: "factory:FluentBundle:*",
    matches: [
      "from fluent.runtime import FluentBundle\n\nbundle = FluentBundle([\"en-US\"])",
    ],
    rejects: [
      "def FluentBundle(*parts, **options):\n    return parts\n\nbundle = FluentBundle([\"en-US\"])",
    ],
  },
  {
    library: FLUENT_RUNTIME,
    patternKey: "factory:FluentBundle:*>call:add_resource:*",
    matches: [
      "from fluent.runtime import FluentBundle\n\nbundle = FluentBundle([\"en-US\"])\nbundle.add_resource(resource)",
    ],
    rejects: [
      "bundle = LocalRegistry()\nbundle.add_resource(resource)",
    ],
  },
  {
    library: FLUENT_RUNTIME,
    patternKey: "factory:FluentBundle:*>call:get_message:*",
    matches: [
      "from fluent.runtime import FluentBundle\n\nbundle = FluentBundle([\"en-US\"])\nmessage = bundle.get_message(\"hello\")",
    ],
    rejects: [
      "bundle = LocalRegistry()\nmessage = bundle.get_message(\"hello\")",
    ],
  },
  {
    library: FLUENT_RUNTIME,
    patternKey: "factory:FluentBundle:*>call:format_pattern:*",
    matches: [
      "from fluent.runtime import FluentBundle\n\nbundle = FluentBundle([\"en-US\"])\nvalue, errors = bundle.format_pattern(message.value, {\"name\": name})",
    ],
    rejects: [
      "bundle = LocalRegistry()\nvalue, errors = bundle.format_pattern(message.value, {\"name\": name})",
    ],
  },
  {
    library: FLUENT_RUNTIME,
    patternKey: "call:FluentResource:*",
    matches: [
      "from fluent.runtime import FluentResource\n\nresource = FluentResource(\"hello = Hello, world!\")",
    ],
    rejects: [
      "def FluentResource(*parts, **options):\n    return parts\n\nresource = FluentResource(\"hello = Hello, world!\")",
    ],
  },
]

const PYTHON_I18N = "python-i18n"

export const pythonI18nFixtures: readonly PatternFixture[] = [
  {
    library: PYTHON_I18N,
    patternKey: "call:t:*",
    matches: [
      "import i18n\n\ni18n.t(\"foo.hi\")",
    ],
    rejects: [
      "i18n = LocalRegistry()\n\ni18n.t(\"foo.hi\")",
    ],
  },
  {
    library: PYTHON_I18N,
    patternKey: "call:set:*",
    matches: [
      "import i18n\n\ni18n.set(\"locale\", \"jp\")",
    ],
    rejects: [
      "i18n = LocalRegistry()\n\ni18n.set(\"locale\", \"jp\")",
    ],
  },
  {
    library: PYTHON_I18N,
    patternKey: "call:add_translation:*",
    matches: [
      "import i18n\n\ni18n.add_translation(\"foo\", \"bar\")",
    ],
    rejects: [
      "i18n = LocalRegistry()\n\ni18n.add_translation(\"foo\", \"bar\")",
    ],
  },
  {
    library: PYTHON_I18N,
    patternKey: "call:load_path.append:*",
    matches: [
      "import i18n\n\ni18n.load_path.append(\"/path/to/translations\")",
    ],
    rejects: [
      "i18n = LocalRegistry()\n\ni18n.load_path.append(\"/path/to/translations\")",
    ],
  },
]
