import type { PatternFixture } from "@/catalogue/types"

const PYTHON_TEST_FILES = "Python test files"

export const pythonTestFilesFixtures: readonly PatternFixture[] = [
  {
    library: PYTHON_TEST_FILES,
    patternKey: "file:**/test_*.py:*",
    matches: ["tests/test_orders.py", "test_orders.py"],
    rejects: ["orders/testing.py", "orders/latest_orders.py"],
  },
  {
    library: PYTHON_TEST_FILES,
    patternKey: "file:**/*_test.py:*",
    matches: ["orders/orders_test.py", "orders_test.py"],
    rejects: ["orders/test.py", "orders/contest.py"],
  },
  {
    library: PYTHON_TEST_FILES,
    patternKey: "file:**/conftest.py:*",
    matches: ["conftest.py", "tests/conftest.py"],
    rejects: ["tests/conftest_helpers.py", "tests/my_conftest.py"],
  },
]
