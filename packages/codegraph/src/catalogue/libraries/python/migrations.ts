import type { CatalogueLibrary } from "@/catalogue/types"

export const alembicLibrary: CatalogueLibrary = {
  name: "Alembic",
  specifiers: ["alembic"],
  documentedVersion: "1.16",
  category: "migrations",
  type: "backend",
  language: "python",
  patterns: [],
  locations: [
    {
      classification: "migration",
      files: [{ glob: "alembic.ini", under: "alembic" }, { glob: "pyproject.toml", under: "tool.alembic" }],
      keys: [{ key: "script_location", holds: "folders", below: "versions/**", default: ["alembic"] }],
    },
  ],
}
