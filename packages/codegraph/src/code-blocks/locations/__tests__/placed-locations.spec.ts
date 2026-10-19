import { codeOf, manifestWith, pathsPlacedAs, requirementsWith } from "./locations-fixture"

const MIGRATION_CANDIDATES = [
  "prisma/migrations/001_init/migration.sql",
  "db/migrations/001_init/migration.sql",
  "drizzle/0001_init.sql",
  "migrations/001_orders.js",
  "db/changes/001_orders.js",
  "src/migrations/1700000000-Orders.ts",
  "alembic/versions/001_orders.py",
  "db/versions/001_orders.py",
  "src/orders.ts",
]

const migrationsOf = (files: Readonly<Record<string, string>>, candidates: readonly string[] = MIGRATION_CANDIDATES): string[] => pathsPlacedAs(files, "migration", candidates)

describe("where a repository keeps its migrations", () => {
  it("places no migration when no migration tool is installed, whatever a folder is named", () => {
    expect(migrationsOf({ "package.json": manifestWith("react") })).toStrictEqual([])
  })

  describe("Prisma", () => {
    it("uses prisma/migrations when nothing says otherwise", () => {
      expect(migrationsOf({ "package.json": manifestWith("prisma", "@prisma/client") })).toStrictEqual(["prisma/migrations/001_init/migration.sql"])
    })

    it("reads migrations.path from prisma.config.ts", () => {
      const files = { "package.json": manifestWith("prisma", "@prisma/client"), "prisma.config.ts": codeOf("export default defineConfig({ migrations: { path: \"db/migrations\" } })") }

      expect(migrationsOf(files)).toStrictEqual(["db/migrations/001_init/migration.sql"])
    })

    it("puts the migrations beside the schema package.json names", () => {
      const manifest = JSON.stringify({ devDependencies: { "prisma": "6.0.0", "@prisma/client": "6.0.0" }, prisma: { schema: "db/schema.prisma" } })

      expect(migrationsOf({ "package.json": manifest })).toStrictEqual(["db/migrations/001_init/migration.sql"])
    })

    it("falls back to its default when migrations.path is computed", () => {
      const files = { "package.json": manifestWith("prisma", "@prisma/client"), "prisma.config.ts": codeOf("export default defineConfig({ migrations: { path: path.join(\"db\", \"m\") } })") }

      expect(migrationsOf(files)).toStrictEqual(["prisma/migrations/001_init/migration.sql"])
    })

    it("reads each package of a monorepo with its own configuration", () => {
      const files = {
        "apps/api/package.json": manifestWith("prisma", "@prisma/client"),
        "apps/api/prisma.config.ts": codeOf("export default defineConfig({ migrations: { path: \"db/migrations\" } })"),
        "apps/jobs/package.json": manifestWith("prisma", "@prisma/client"),
      }
      const candidates = ["apps/api/db/migrations/1/migration.sql", "apps/api/prisma/migrations/1/migration.sql", "apps/jobs/prisma/migrations/1/migration.sql"]

      expect(migrationsOf(files, candidates)).toStrictEqual(["apps/api/db/migrations/1/migration.sql", "apps/jobs/prisma/migrations/1/migration.sql"])
    })
  })

  describe("Drizzle", () => {
    it("uses its default out folder when the configuration is silent", () => {
      const files = { "package.json": manifestWith("drizzle-orm"), "drizzle.config.ts": codeOf("export default defineConfig({ dialect: \"postgresql\" })") }

      expect(migrationsOf(files)).toStrictEqual(["drizzle/0001_init.sql"])
    })

    it("reads out when the configuration moves the migrations", () => {
      const files = { "package.json": manifestWith("drizzle-orm"), "drizzle.config.ts": codeOf("export default defineConfig({ out: \"./db/migrations\" })") }

      expect(migrationsOf(files)).toStrictEqual(["db/migrations/001_init/migration.sql"])
    })

    it("falls back to its default when out is computed", () => {
      const files = { "package.json": manifestWith("drizzle-orm"), "drizzle.config.ts": codeOf("export default defineConfig({ out: process.env.OUT })") }

      expect(migrationsOf(files)).toStrictEqual(["drizzle/0001_init.sql"])
    })

    it("reads each package of a monorepo with its own configuration", () => {
      const files = {
        "apps/api/package.json": manifestWith("drizzle-orm"),
        "apps/api/drizzle.config.ts": codeOf("export default defineConfig({ out: \"./sql\" })"),
        "apps/jobs/package.json": manifestWith("drizzle-orm"),
      }

      expect(migrationsOf(files, ["apps/api/sql/0001.sql", "apps/api/drizzle/0001.sql", "apps/jobs/drizzle/0001.sql"])).toStrictEqual([
        "apps/api/sql/0001.sql",
        "apps/jobs/drizzle/0001.sql",
      ])
    })
  })

  describe("Knex", () => {
    it("uses migrations when nothing says otherwise", () => {
      expect(migrationsOf({ "package.json": manifestWith("knex") })).toStrictEqual(["migrations/001_orders.js"])
    })

    it("reads the directory of each environment of the knexfile", () => {
      const files = { "package.json": manifestWith("knex"), "knexfile.js": codeOf("module.exports = { development: { migrations: { directory: \"./db/changes\" } } }") }

      expect(migrationsOf(files)).toStrictEqual(["db/changes/001_orders.js"])
    })

    it("falls back to its default when the directory is computed", () => {
      const files = { "package.json": manifestWith("knex"), "knexfile.js": codeOf("module.exports = { migrations: { directory: path.join(__dirname, \"db\") } }") }

      expect(migrationsOf(files)).toStrictEqual(["migrations/001_orders.js"])
    })

    it("reads each package of a monorepo with its own configuration", () => {
      const files = {
        "apps/api/package.json": manifestWith("knex"),
        "apps/api/knexfile.ts": codeOf("export default { migrations: { directory: \"./db/changes\" } }"),
        "apps/jobs/package.json": manifestWith("knex"),
      }

      expect(migrationsOf(files, ["apps/api/db/changes/1.ts", "apps/api/migrations/1.ts", "apps/jobs/migrations/1.ts"])).toStrictEqual([
        "apps/api/db/changes/1.ts",
        "apps/jobs/migrations/1.ts",
      ])
    })
  })

  describe("TypeORM", () => {
    it("reads migrations from the options of its DataSource", () => {
      const files = {
        "package.json": manifestWith("typeorm"),
        "src/data-source.ts": codeOf("export const AppDataSource = new DataSource({ type: \"postgres\", migrations: [\"src/migrations/*.ts\"] })"),
      }

      expect(migrationsOf(files)).toStrictEqual(["src/migrations/1700000000-Orders.ts"])
    })

    it("places nothing when the migrations are classes or the data source is silent", () => {
      const files = {
        "package.json": manifestWith("typeorm"),
        "src/data-source.ts": codeOf("export const AppDataSource = new DataSource({ migrations: [CreateOrders] })"),
      }

      expect(migrationsOf(files)).toStrictEqual([])
    })
  })

  describe("Sequelize", () => {
    it("reads migrations-path from .sequelizerc", () => {
      const files = { "package.json": manifestWith("sequelize"), ".sequelizerc": codeOf("module.exports = { \"migrations-path\": \"db/changes\" }") }

      expect(migrationsOf(files)).toStrictEqual(["db/changes/001_orders.js"])
    })

    it("falls back to its default when the path is computed", () => {
      const files = { "package.json": manifestWith("sequelize"), ".sequelizerc": codeOf("module.exports = { \"migrations-path\": path.resolve(\"db\", \"changes\") }") }

      expect(migrationsOf(files)).toStrictEqual(["migrations/001_orders.js"])
    })
  })

  describe("MikroORM", () => {
    it("reads migrations.path, and uses its default when silent", () => {
      const moved = { "package.json": manifestWith("@mikro-orm/core"), "mikro-orm.config.ts": codeOf("export default defineConfig({ migrations: { path: \"./db/changes\" } })") }
      const silent = { "package.json": manifestWith("@mikro-orm/core"), "mikro-orm.config.ts": codeOf("export default defineConfig({ debug: true })") }

      expect(migrationsOf(moved)).toStrictEqual(["db/changes/001_orders.js"])
      expect(migrationsOf(silent)).toStrictEqual(["migrations/001_orders.js"])
    })
  })

  describe("Alembic", () => {
    it("reads script_location from alembic.ini, and uses its default when silent", () => {
      const moved = { "requirements.txt": requirementsWith("alembic"), "alembic.ini": codeOf("[alembic]", "script_location = %(here)s/db") }
      const silent = { "requirements.txt": requirementsWith("alembic"), "alembic.ini": codeOf("[alembic]", "sqlalchemy.url = sqlite://") }

      expect(migrationsOf(moved)).toStrictEqual(["db/versions/001_orders.py"])
      expect(migrationsOf(silent)).toStrictEqual(["alembic/versions/001_orders.py"])
    })

    it("reads each package of a monorepo with its own configuration", () => {
      const files = {
        "services/orders/requirements.txt": requirementsWith("alembic"),
        "services/orders/alembic.ini": codeOf("[alembic]", "script_location = migrations"),
        "services/users/requirements.txt": requirementsWith("alembic"),
      }

      expect(migrationsOf(files, ["services/orders/migrations/versions/1.py", "services/orders/alembic/versions/1.py", "services/users/alembic/versions/1.py"])).toStrictEqual([
        "services/orders/migrations/versions/1.py",
        "services/users/alembic/versions/1.py",
      ])
    })
  })

  describe("Django", () => {
    const settings = codeOf(
      "INSTALLED_APPS = [\"django.contrib.admin\", \"orders.apps.OrdersConfig\", \"billing\"]",
      "MIGRATION_MODULES = {\"billing\": \"billing.schema_changes\"}",
      "LOCALE_PATHS = [\"translations\"]",
    )
    const candidates = ["orders/migrations/0001_initial.py", "billing/schema_changes/0001_initial.py", "billing/migrations/0001_initial.py", "users/migrations/0001_initial.py"]

    it("reads the apps and the migration modules of the settings", () => {
      const files = { "requirements.txt": requirementsWith("django"), "shop/settings.py": settings }

      expect(migrationsOf(files, candidates)).toStrictEqual(["orders/migrations/0001_initial.py", "billing/schema_changes/0001_initial.py", "billing/migrations/0001_initial.py"])
    })

    it("takes the migrations of every app when the apps are computed", () => {
      const files = { "requirements.txt": requirementsWith("django"), "shop/settings.py": codeOf("INSTALLED_APPS = BASE_APPS + LOCAL_APPS") }

      expect(migrationsOf(files, candidates)).toStrictEqual(["orders/migrations/0001_initial.py", "billing/migrations/0001_initial.py", "users/migrations/0001_initial.py"])
    })

    it("reads the locale paths of the settings, and marks the settings as config", () => {
      const files = { "requirements.txt": requirementsWith("django"), "shop/settings.py": settings }

      expect(pathsPlacedAs(files, "i18n", ["translations/fr/LC_MESSAGES/django.po", "orders/locale/fr/django.po", "orders/views.py"])).toStrictEqual([
        "translations/fr/LC_MESSAGES/django.po",
        "orders/locale/fr/django.po",
      ])
      expect(pathsPlacedAs(files, "config", ["shop/settings.py", "shop/urls.py"])).toStrictEqual(["shop/settings.py"])
    })
  })
})

describe("where a repository keeps its data models", () => {
  it("reads the schema of the Drizzle configuration, as a file or a folder", () => {
    const file = { "package.json": manifestWith("drizzle-orm"), "drizzle.config.ts": codeOf("export default defineConfig({ schema: \"./src/db/schema.ts\" })") }
    const folder = { "package.json": manifestWith("drizzle-orm"), "drizzle.config.ts": codeOf("export default defineConfig({ schema: \"./src/db/schema\" })") }
    const candidates = ["src/db/schema.ts", "src/db/schema/orders.ts", "src/db/client.ts"]

    expect(pathsPlacedAs(file, "data-model", candidates)).toStrictEqual(["src/db/schema.ts"])
    expect(pathsPlacedAs(folder, "data-model", candidates)).toStrictEqual(["src/db/schema/orders.ts"])
  })
})

describe("where a repository keeps its configuration", () => {
  it("reads the path dotenv loads", () => {
    const files = { "package.json": manifestWith("dotenv"), "src/index.ts": codeOf("import dotenv from \"dotenv\"", "dotenv.config({ path: \"config/app.env\" })") }

    expect(pathsPlacedAs(files, "config", ["src/config/app.env", "config/app.env"])).toStrictEqual(["src/config/app.env"])
  })

  it("reads NODE_CONFIG_DIR for node-config, and uses config when silent", () => {
    const moved = { "package.json": manifestWith("config"), ".env": codeOf("PORT=3000", "NODE_CONFIG_DIR=./settings") }
    const silent = { "package.json": manifestWith("config") }
    const candidates = ["settings/default.json", "config/default.json"]

    expect(pathsPlacedAs(moved, "config", candidates)).toStrictEqual(["settings/default.json"])
    expect(pathsPlacedAs(silent, "config", candidates)).toStrictEqual(["config/default.json"])
  })

  it("reads the config_path of a Hydra entry point", () => {
    const files = { "requirements.txt": requirementsWith("hydra-core"), "main.py": codeOf("import hydra", "", "@hydra.main(version_base=None, config_path=\"conf\", config_name=\"config\")", "def main(cfg):", "    pass") }

    expect(pathsPlacedAs(files, "config", ["conf/config.yaml", "src/config.yaml"])).toStrictEqual(["conf/config.yaml"])
  })
})

describe("where a repository keeps what builds and runs it", () => {
  const candidates = ["api.Dockerfile", ".devcontainer/setup.sh", "charts/api/templates/deployment.yaml", "deploy/overlays/prod/patch.yaml", "src/app.ts"]

  it("reads the Dockerfile a Compose service builds", () => {
    const compose = codeOf("services:", "  api:", "    build:", "      context: .", "      dockerfile: api.Dockerfile", "    ports:", "      - \"3000:3000\"")

    expect(pathsPlacedAs({ "docker-compose.yml": compose }, "build-and-infrastructure", candidates)).toStrictEqual(["api.Dockerfile"])
  })

  it("takes the folder of a dev container, a Helm chart and a Kustomization", () => {
    const files = {
      ".devcontainer/devcontainer.json": codeOf("{", "  // the image", "  \"image\": \"node:22\"", "}"),
      "charts/api/Chart.yaml": codeOf("apiVersion: v2", "name: api"),
      "deploy/overlays/prod/kustomization.yaml": codeOf("resources:", "  - ../../base"),
    }

    expect(pathsPlacedAs(files, "build-and-infrastructure", candidates)).toStrictEqual([
      ".devcontainer/setup.sh",
      "charts/api/templates/deployment.yaml",
      "deploy/overlays/prod/patch.yaml",
    ])
  })
})

describe("where a Python repository keeps the files python-dotenv and Dynaconf load", () => {
  it("reads the dotenv_path load_dotenv is handed by name or by position", () => {
    const named = { "requirements.txt": requirementsWith("python-dotenv"), "app/settings.py": codeOf("from dotenv import load_dotenv", "", "load_dotenv(dotenv_path=\"config/app.env\")") }
    const positional = { "requirements.txt": requirementsWith("python-dotenv"), "main.py": codeOf("from dotenv import load_dotenv", "", "load_dotenv(\"deploy/.env.local\")") }

    expect(pathsPlacedAs(named, "config", ["app/config/app.env", "config/app.env"])).toStrictEqual(["app/config/app.env"])
    expect(pathsPlacedAs(positional, "config", ["deploy/.env.local", "deploy/.env"])).toStrictEqual(["deploy/.env.local"])
  })

  it("places nothing for python-dotenv when load_dotenv names no file", () => {
    const files = { "requirements.txt": requirementsWith("python-dotenv"), "main.py": codeOf("from dotenv import load_dotenv", "", "load_dotenv()") }

    expect(pathsPlacedAs(files, "config", ["config/app.env"])).toStrictEqual([])
  })

  it("reads the settings_files of a Dynaconf instance", () => {
    const files = { "requirements.txt": requirementsWith("dynaconf"), "config.py": codeOf("from dynaconf import Dynaconf", "", "settings = Dynaconf(settings_files=[\"settings.toml\", \".secrets.toml\"])") }

    expect(pathsPlacedAs(files, "config", ["settings.toml", ".secrets.toml", "other.toml"])).toStrictEqual(["settings.toml", ".secrets.toml"])
  })

  it("reads the settings_files FlaskDynaconf is handed in app.py", () => {
    const files = { "requirements.txt": requirementsWith("dynaconf"), "app.py": codeOf("from dynaconf import FlaskDynaconf", "", "FlaskDynaconf(app, settings_files=[\"conf/*.yaml\"])") }

    expect(pathsPlacedAs(files, "config", ["conf/base.yaml", "settings.yaml"])).toStrictEqual(["conf/base.yaml"])
  })
})

describe("a path a configuration builds from fixed parts", () => {
  it("reads path.join and path.resolve of __dirname and text as the folder they name", () => {
    const knex = { "package.json": manifestWith("knex"), "knexfile.js": codeOf("const path = require(\"node:path\")", "module.exports = { migrations: { directory: path.join(__dirname, \"db\", \"changes\") } }") }
    const sequelize = { "package.json": manifestWith("sequelize"), ".sequelizerc": codeOf("const { resolve } = require(\"path\")", "module.exports = { \"migrations-path\": resolve(\"db\", \"changes\") }") }

    expect(pathsPlacedAs(knex, "migration", ["db/changes/001_orders.js", "migrations/001_orders.js"])).toStrictEqual(["db/changes/001_orders.js"])
    expect(pathsPlacedAs(sequelize, "migration", ["db/changes/001_orders.js", "migrations/001_orders.js"])).toStrictEqual(["db/changes/001_orders.js"])
  })

  it("reads a file URL made from import.meta.url", () => {
    const vite = codeOf(
      "import { fileURLToPath, URL } from \"node:url\"",
      "import VueI18nPlugin from \"@intlify/unplugin-vue-i18n/vite\"",
      "export default defineConfig({ plugins: [VueI18nPlugin({ include: fileURLToPath(new URL(\"./src/locales/**\", import.meta.url)) })] })",
    )
    const files = { "package.json": manifestWith("vue-i18n", "@intlify/unplugin-vue-i18n"), "vite.config.ts": vite }

    expect(pathsPlacedAs(files, "i18n", ["src/locales/en.json", "locales/en.json"])).toStrictEqual(["src/locales/en.json"])
  })

  it("leaves a call of a function the path module does not export computed", () => {
    const files = { "package.json": manifestWith("knex"), "knexfile.js": codeOf("const path = require(\"node:path\")", "module.exports = { migrations: { directory: path.relative(__dirname, \"db\") } }") }

    expect(pathsPlacedAs(files, "migration", ["db/001_orders.js", "migrations/001_orders.js"])).toStrictEqual(["migrations/001_orders.js"])
  })
})

describe("Flask settings written on the app or in a class", () => {
  const candidates = ["i18n/de/LC_MESSAGES/messages.po", "more/de/LC_MESSAGES/messages.po", "translations/de/LC_MESSAGES/messages.po"]

  it("reads app.config[...] and a class of settings, and splits the folders on semicolons", () => {
    const onApp = { "requirements.txt": requirementsWith("flask-babel"), "app.py": codeOf("app = Flask(__name__)", "app.config[\"BABEL_TRANSLATION_DIRECTORIES\"] = \"i18n;more\"") }
    const inClass = { "requirements.txt": requirementsWith("flask-babel"), "config.py": codeOf("class Config:", "    BABEL_TRANSLATION_DIRECTORIES = \"i18n\"") }

    expect(pathsPlacedAs(onApp, "i18n", candidates)).toStrictEqual(["i18n/de/LC_MESSAGES/messages.po", "more/de/LC_MESSAGES/messages.po"])
    expect(pathsPlacedAs(inClass, "i18n", candidates)).toStrictEqual(["i18n/de/LC_MESSAGES/messages.po"])
  })

  it("drops the default when only the keyword of Babel names the folders", () => {
    const files = { "requirements.txt": requirementsWith("flask-babel"), "app.py": codeOf("babel = Babel(app, default_translation_directories=\"i18n\")") }

    expect(pathsPlacedAs(files, "i18n", candidates)).toStrictEqual(["i18n/de/LC_MESSAGES/messages.po"])
  })
})
