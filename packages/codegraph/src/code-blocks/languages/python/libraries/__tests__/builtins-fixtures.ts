import type { PatternFixture } from "@/catalogue/types"

const PYTHON_BUILTINS = "Python builtins"

export const builtinsFixtures: readonly PatternFixture[] = [
  {
    library: PYTHON_BUILTINS,
    patternKey: "call:open:*",
    matches: [
      "with open(\"uploads/report.csv\", encoding=\"utf-8\") as report:\n    rows = report.readlines()",
      "import builtins\n\nreport = builtins.open(\"uploads/report.csv\", \"w\")",
      "from builtins import open as open_file\n\nreport = open_file(\"uploads/report.csv\")",
    ],
    rejects: [
      "def open(path):\n    return path\n\nreport = open(\"uploads/report.csv\")",
      "def read_report(open):\n    return open(\"uploads/report.csv\")",
      "from storage import open\n\nreport = open(\"uploads/report.csv\")",
    ],
  },
]
