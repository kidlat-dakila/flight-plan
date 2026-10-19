import { codeOf, manifestWith, pathsPlacedAs, requirementsWith, type RepositoryFiles } from "./locations-fixture"

const translationsOf = (files: RepositoryFiles, candidates: readonly string[]): string[] => pathsPlacedAs(files, "i18n", candidates)

describe("where a repository keeps its translations", () => {
  it("places no translation when no i18n library is installed, whatever a folder is named", () => {
    const files = { "package.json": manifestWith("react"), "src/i18n.ts": codeOf("i18n.init({ backend: { loadPath: \"/locales/{{lng}}.json\" } })") }

    expect(translationsOf(files, ["public/locales/de/common.json", "locale/de/messages.po"])).toStrictEqual([])
  })

  describe("i18next", () => {
    const manifest = manifestWith("i18next", "react-i18next", "i18next-http-backend")
    const candidates = ["public/locales/de/common.json", "public/translations/de/common.json", "src/locales/de/common.json"]
    const configOf = (loadPath: string): string =>
      codeOf(
        "import i18n from \"i18next\"",
        "import HttpBackend from \"i18next-http-backend\"",
        `i18n.use(HttpBackend).use(initReactI18next).init({ fallbackLng: "en", backend: { loadPath: ${loadPath} } })`,
        "export default i18n",
      )

    it("reads backend.loadPath of the init call, below the public folder of the package", () => {
      const files = { "package.json": manifest, "src/i18n.ts": configOf("\"/translations/{{lng}}/{{ns}}.json\"") }

      expect(translationsOf(files, candidates)).toStrictEqual(["public/translations/de/common.json"])
    })

    it("uses the default of i18next-http-backend when the configuration is silent or missing", () => {
      const silent = { "package.json": manifest, "src/i18n/index.ts": codeOf("import i18n from \"i18next\"", "i18n.init({ fallbackLng: \"en\" })") }
      const missing = { "package.json": manifest }

      expect(translationsOf(silent, candidates)).toStrictEqual(["public/locales/de/common.json"])
      expect(translationsOf(missing, candidates)).toStrictEqual(["public/locales/de/common.json"])
    })

    it("falls back to its default when loadPath is computed", () => {
      const files = { "package.json": manifest, "src/i18n/config.ts": configOf("(languages, namespaces) => apiPathOf(languages, namespaces)") }

      expect(translationsOf(files, candidates)).toStrictEqual(["public/locales/de/common.json"])
    })

    it("reads each package of a monorepo with its own configuration", () => {
      const files = {
        "apps/web/package.json": manifest,
        "apps/web/src/i18n.ts": configOf("\"/translations/{{lng}}/{{ns}}.json\""),
        "apps/admin/package.json": manifest,
      }
      const monorepoCandidates = ["apps/web/public/translations/de/common.json", "apps/web/public/locales/de/common.json", "apps/admin/public/locales/de/common.json"]

      expect(translationsOf(files, monorepoCandidates)).toStrictEqual(["apps/web/public/translations/de/common.json", "apps/admin/public/locales/de/common.json"])
    })
  })

  describe("next-intl", () => {
    const manifest = manifestWith("next", "next-intl")
    const candidates = ["messages/de.json", "locales/de.json", "src/i18n/messages/de.json"]
    const messagesImportOf = (folder: string): string => `(await import(\`${folder}/\${locale}.json\`)).default`
    const requestOf = (messages: string): string =>
      codeOf(
        "import { getRequestConfig } from \"next-intl/server\"",
        "export default getRequestConfig(async ({ requestLocale }) => {",
        "  const locale = (await requestLocale) ?? \"en\"",
        `  return { locale, messages: ${messages} }`,
        "})",
      )

    it("reads the messages its request configuration imports, from the folder of that configuration", () => {
      const files = { "package.json": manifest, "src/i18n/request.ts": requestOf(messagesImportOf("../../locales")) }

      expect(translationsOf(files, candidates)).toStrictEqual(["locales/de.json"])
    })

    it("uses the messages folder of the package when the request configuration imports no messages or is missing", () => {
      const silent = { "package.json": manifest, "src/i18n/request.ts": requestOf("{}") }
      const missing = { "package.json": manifest }

      expect(translationsOf(silent, candidates)).toStrictEqual(["messages/de.json"])
      expect(translationsOf(missing, candidates)).toStrictEqual(["messages/de.json"])
    })

    it("uses the messages folder of the package when the imported path is computed", () => {
      const files = { "package.json": manifest, "src/i18n/request.ts": requestOf("(await import(messagesPathOf(locale))).default") }

      expect(translationsOf(files, candidates)).toStrictEqual(["messages/de.json"])
    })

    it("reads each package of a monorepo with its own configuration", () => {
      const files = {
        "apps/shop/package.json": manifest,
        "apps/shop/src/i18n/request.ts": requestOf(messagesImportOf("../../messages")),
        "apps/blog/package.json": manifest,
        "apps/blog/i18n/request.ts": requestOf(messagesImportOf("../translations")),
      }
      const monorepoCandidates = ["apps/shop/messages/de.json", "apps/shop/translations/de.json", "apps/blog/translations/de.json", "apps/blog/messages/de.json"]

      expect(translationsOf(files, monorepoCandidates)).toStrictEqual(["apps/shop/messages/de.json", "apps/blog/translations/de.json"])
    })
  })

  describe("vue-i18n", () => {
    const manifest = manifestWith("vue", "vue-i18n", "@intlify/unplugin-vue-i18n")
    const candidates = ["src/i18n/locales/de.json", "src/locales/de.json"]
    const viteConfigOf = (options: string): string =>
      codeOf(
        "import VueI18nPlugin from \"@intlify/unplugin-vue-i18n/vite\"",
        `export default defineConfig({ plugins: [vue(), VueI18nPlugin(${options})] })`,
      )

    it("reads the include of its Vite plugin", () => {
      const files = { "package.json": manifest, "vite.config.ts": viteConfigOf("{ include: [\"./src/i18n/locales/**\"] }") }

      expect(translationsOf(files, candidates)).toStrictEqual(["src/i18n/locales/de.json"])
    })

    it("places nothing when the plugin is silent, since include has no default", () => {
      const files = { "package.json": manifest, "vite.config.ts": viteConfigOf("{ runtimeOnly: false }") }

      expect(translationsOf(files, candidates)).toStrictEqual([])
    })

    it("places nothing when include is computed", () => {
      const files = { "package.json": manifest, "vite.config.ts": viteConfigOf("{ include: [path.resolve(__dirname, \"./src/locales/**\")] }") }

      expect(translationsOf(files, candidates)).toStrictEqual([])
    })

    it("reads each package of a monorepo with its own configuration", () => {
      const files = {
        "apps/web/package.json": manifest,
        "apps/web/vite.config.ts": viteConfigOf("{ include: \"./src/i18n/locales/**\" }"),
        "apps/docs/package.json": manifest,
        "apps/docs/vite.config.ts": viteConfigOf("{ include: \"./src/locales/**\" }"),
      }
      const monorepoCandidates = ["apps/web/src/i18n/locales/de.json", "apps/web/src/locales/de.json", "apps/docs/src/locales/de.json", "apps/docs/src/i18n/locales/de.json"]

      expect(translationsOf(files, monorepoCandidates)).toStrictEqual(["apps/web/src/i18n/locales/de.json", "apps/docs/src/locales/de.json"])
    })
  })

  describe("Lingui", () => {
    const manifest = manifestWith("@lingui/core", "@lingui/react")
    const candidates = ["src/locales/de/messages.po", "locale/de/messages.po", "src/app.tsx"]
    const configOf = (path: string): string =>
      codeOf("import { defineConfig } from \"@lingui/conf\"", `export default defineConfig({ sourceLocale: "en", locales: ["en", "de"], catalogs: [{ path: ${path}, include: ["src"] }] })`)

    it("reads the path of its catalogs", () => {
      const files = { "package.json": manifest, "lingui.config.ts": configOf("\"<rootDir>/src/locales/{locale}/messages\"") }

      expect(translationsOf(files, candidates)).toStrictEqual(["src/locales/de/messages.po"])
    })

    it("uses its default catalog when the configuration is silent or missing", () => {
      const silent = { "package.json": manifest, "lingui.config.js": codeOf("module.exports = { locales: [\"en\", \"de\"] }") }
      const missing = { "package.json": manifest }

      expect(translationsOf(silent, candidates)).toStrictEqual(["locale/de/messages.po"])
      expect(translationsOf(missing, candidates)).toStrictEqual(["locale/de/messages.po"])
    })

    it("falls back to its default when the path is computed", () => {
      const files = { "package.json": manifest, "lingui.config.ts": configOf("join(root, \"{locale}\", \"messages\")") }

      expect(translationsOf(files, candidates)).toStrictEqual(["locale/de/messages.po"])
    })

    it("reads each package of a monorepo with its own configuration, in lingui.config or under lingui in package.json", () => {
      const files = {
        "packages/app/package.json": JSON.stringify({
          dependencies: { "@lingui/core": "6.10.0" },
          lingui: { catalogs: [{ path: "<rootDir>/src/locales/{locale}/messages", include: ["<rootDir>/src"] }] },
        }),
        "packages/admin/package.json": manifest,
        "packages/admin/lingui.config.ts": configOf("\"i18n/{locale}\""),
        "packages/site/package.json": manifest,
      }
      const monorepoCandidates = [
        "packages/app/src/locales/de/messages.po",
        "packages/app/locale/de/messages.po",
        "packages/admin/i18n/de.po",
        "packages/admin/locale/de/messages.po",
        "packages/site/locale/de/messages.po",
      ]

      expect(translationsOf(files, monorepoCandidates)).toStrictEqual([
        "packages/app/src/locales/de/messages.po",
        "packages/admin/i18n/de.po",
        "packages/site/locale/de/messages.po",
      ])
    })
  })

  describe("Babel", () => {
    const candidates = ["babel.cfg", "app/i18n/de/LC_MESSAGES/messages.mo", "translations/de/LC_MESSAGES/messages.mo", "app/views.py"]

    it("marks its mapping file, and reads the catalog folders of setup.cfg", () => {
      const files = { "requirements.txt": requirementsWith("Babel"), "babel.cfg": codeOf("[python: **.py]"), "setup.cfg": codeOf("[compile_catalog]", "directory = app/i18n") }

      expect(translationsOf(files, candidates)).toStrictEqual(["babel.cfg", "app/i18n/de/LC_MESSAGES/messages.mo"])
    })

    it("marks only its mapping file when setup.cfg is silent, since pybabel names its folder on the command line", () => {
      const files = { "requirements.txt": requirementsWith("Babel"), "babel.cfg": codeOf("[python: **.py]"), "setup.cfg": codeOf("[metadata]", "name = shop") }

      expect(translationsOf(files, candidates)).toStrictEqual(["babel.cfg"])
    })

    it("reads each package of a monorepo with its own configuration", () => {
      const files = {
        "services/shop/requirements.txt": requirementsWith("Babel"),
        "services/shop/setup.cfg": codeOf("[init_catalog]", "output_dir = app/i18n"),
        "services/blog/requirements.txt": requirementsWith("Babel"),
        "services/blog/setup.cfg": codeOf("[update_catalog]", "output_dir = locales"),
      }
      const monorepoCandidates = ["services/shop/app/i18n/de/LC_MESSAGES/messages.po", "services/shop/locales/de/LC_MESSAGES/messages.po", "services/blog/locales/de/LC_MESSAGES/messages.po"]

      expect(translationsOf(files, monorepoCandidates)).toStrictEqual(["services/shop/app/i18n/de/LC_MESSAGES/messages.po", "services/blog/locales/de/LC_MESSAGES/messages.po"])
    })
  })

  describe("Flask-Babel", () => {
    const requirements = requirementsWith("Flask", "Flask-Babel")
    const candidates = ["babel.cfg", "translations/de/LC_MESSAGES/messages.mo", "i18n/de/LC_MESSAGES/messages.mo", "app.py"]

    it("reads BABEL_TRANSLATION_DIRECTORIES of the configuration, and marks the mapping file", () => {
      const files = { "requirements.txt": requirements, "babel.cfg": codeOf("[python: **.py]"), "config.py": codeOf("BABEL_DEFAULT_LOCALE = \"en\"", "BABEL_TRANSLATION_DIRECTORIES = \"i18n\"") }

      expect(translationsOf(files, candidates)).toStrictEqual(["babel.cfg", "i18n/de/LC_MESSAGES/messages.mo"])
    })

    it("reads the directories set through app.config.update", () => {
      const files = { "requirements.txt": requirements, "app.py": codeOf("app = Flask(__name__)", "app.config.update(BABEL_TRANSLATION_DIRECTORIES=\"i18n\")", "babel = Babel(app)") }

      expect(translationsOf(files, candidates)).toStrictEqual(["i18n/de/LC_MESSAGES/messages.mo"])
    })

    it("reads the directories handed to Babel and to init_app", () => {
      const handed = { "requirements.txt": requirements, "app.py": codeOf("app = Flask(__name__)", "babel = Babel(app, default_translation_directories=\"i18n\")") }
      const initialised = { "requirements.txt": requirements, "app.py": codeOf("babel = Babel()", "babel.init_app(app, default_translation_directories=\"i18n\")") }

      expect(translationsOf(handed, candidates)).toContain("i18n/de/LC_MESSAGES/messages.mo")
      expect(translationsOf(initialised, candidates)).toContain("i18n/de/LC_MESSAGES/messages.mo")
    })

    it("uses translations when the configuration is silent or missing", () => {
      const silent = { "requirements.txt": requirements, "app.py": codeOf("app = Flask(__name__)", "babel = Babel(app, locale_selector=get_locale)") }
      const missing = { "requirements.txt": requirements }

      expect(translationsOf(silent, candidates)).toStrictEqual(["translations/de/LC_MESSAGES/messages.mo"])
      expect(translationsOf(missing, candidates)).toStrictEqual(["translations/de/LC_MESSAGES/messages.mo"])
    })

    it("falls back to translations when the directories are computed", () => {
      const files = { "requirements.txt": requirements, "config.py": codeOf("BABEL_TRANSLATION_DIRECTORIES = os.path.join(BASE_DIR, \"i18n\")") }

      expect(translationsOf(files, candidates)).toStrictEqual(["translations/de/LC_MESSAGES/messages.mo"])
    })

    it("reads each package of a monorepo with its own configuration", () => {
      const files = {
        "services/shop/requirements.txt": requirements,
        "services/shop/config.py": codeOf("BABEL_TRANSLATION_DIRECTORIES = \"i18n\""),
        "services/blog/requirements.txt": requirements,
      }
      const monorepoCandidates = ["services/shop/i18n/de/LC_MESSAGES/messages.mo", "services/shop/translations/de/LC_MESSAGES/messages.mo", "services/blog/translations/de/LC_MESSAGES/messages.mo"]

      expect(translationsOf(files, monorepoCandidates)).toStrictEqual(["services/shop/i18n/de/LC_MESSAGES/messages.mo", "services/blog/translations/de/LC_MESSAGES/messages.mo"])
    })
  })

  describe("fastapi-babel", () => {
    const requirements = requirementsWith("fastapi", "fastapi-babel")
    const candidates = ["lang/fa/LC_MESSAGES/messages.mo", "babel.cfg", "main.py"]
    const mainOf = (directory: string): string =>
      codeOf("from fastapi_babel import BabelConfigs", "", `configs = BabelConfigs(ROOT_DIR=__file__, BABEL_DEFAULT_LOCALE="en", BABEL_TRANSLATION_DIRECTORY=${directory})`)

    it("reads BABEL_TRANSLATION_DIRECTORY of BabelConfigs, and marks the mapping file", () => {
      const files = { "requirements.txt": requirements, "babel.cfg": codeOf("[python: **.py]"), "main.py": mainOf("\"lang\"") }

      expect(translationsOf(files, candidates)).toStrictEqual(["lang/fa/LC_MESSAGES/messages.mo", "babel.cfg"])
    })

    it("places no folder when the directory is computed, since BabelConfigs has no default", () => {
      const files = { "requirements.txt": requirements, "main.py": mainOf("settings.translations") }

      expect(translationsOf(files, candidates)).toStrictEqual([])
    })
  })
})
