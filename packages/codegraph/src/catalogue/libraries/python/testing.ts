import type { CatalogueLibrary } from "@/catalogue/types"

const PYTEST_CONFIG_FILES = [
  { glob: "pytest.ini", under: "pytest" },
  { glob: "pyproject.toml", under: "tool.pytest.ini_options" },
  { glob: "pyproject.toml", under: "tool.pytest" },
  { glob: "tox.ini", under: "pytest" },
  { glob: "setup.cfg", under: "tool:pytest" },
] as const

export const pytestLibrary: CatalogueLibrary = {
  name: "pytest",
  specifiers: ["pytest"],
  documentedVersion: "8.4.0",
  category: "testing",
  type: "backend",
  language: "python",
  patterns: [],
  locations: [
    {
      classification: "test",
      files: PYTEST_CONFIG_FILES,
      keys: [
        { key: "testpaths", holds: "folders", isScope: true },
        { key: "python_files", holds: "names", default: ["test_*.py", "*_test.py"] },
      ],
    },
    {
      classification: "test",
      files: [],
      keys: [{ key: "conftest", holds: "names", default: ["conftest.py"] }],
    },
  ],
}
