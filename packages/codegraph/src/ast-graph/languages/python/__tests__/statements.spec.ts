import type { Statement, StatementArm } from "@/ast-graph"
import { PYTHON_READING, sourceOf } from "@/ast-graph/languages/__tests__/script-files"

const { fileOf, syntaxOf } = PYTHON_READING
const INDENT = "  "

const describeArm = (arm: StatementArm, indent: string): string[] => [
  `${indent}${arm.label}${arm.subject === null ? "" : ` of ${arm.subject}`}`,
  ...arm.arms.flatMap((nested) => describeArm(nested, `${indent}${INDENT}`)),
  ...arm.statements.flatMap((statement) => describeStatement(statement, `${indent}${INDENT}`)),
]

function describeStatement(statement: Statement, indent = ""): string[] {
  return [
    `${indent}${statement.type} ${statement.text}`,
    ...statement.arms.flatMap((arm) => describeArm(arm, `${indent}${INDENT}`)),
    ...statement.statements.flatMap((nested) => describeStatement(nested, `${indent}${INDENT}`)),
  ]
}

const statementsIn = (source: string, name: string): string[] => {
  const file = fileOf(source)
  const encapsulation = syntaxOf(source).rootEncapsulations.find((root) => root.name === name)
  return encapsulation === undefined ? [] : file.listStatements(encapsulation).flatMap((statement) => describeStatement(statement))
}

describe("the statements PythonASTGraphFile reads", () => {
  it("lists the statements of a function in order, each with its type and its first line", () => {
    const source = sourceOf(
      "def place(order):",
      "    total = price_of(order)",
      "    audit(order)",
      "    assert total > 0",
      "    return total",
    )

    expect(statementsIn(source, "place")).toStrictEqual([
      "declaration total = price_of(order)",
      "expression audit(order)",
      "expression assert total > 0",
      "return return total",
    ])
  })

  it("nests the branches of a condition as arms, each with what it tests", () => {
    const source = sourceOf(
      "def grade(score):",
      "    if score > 90:",
      "        return \"high\"",
      "    elif score > 50:",
      "        return \"middle\"",
      "    else:",
      "        raise ValueError(score)",
    )

    expect(statementsIn(source, "grade")).toStrictEqual([
      "conditional if score > 90",
      "  then of score > 90",
      "    return return \"high\"",
      "  then of score > 50",
      "    return return \"middle\"",
      "  else of score > 90",
      "    throw raise ValueError(score)",
    ])
  })

  it("nests the body of a loop, of a try and of a with under the statement", () => {
    const source = sourceOf(
      "def run(jobs):",
      "    for job in jobs:",
      "        if job.done:",
      "            continue",
      "        job.start()",
      "    while jobs.pending():",
      "        break",
      "    try:",
      "        flush()",
      "    except IOError:",
      "        retry()",
      "    finally:",
      "        close()",
      "    with lock():",
      "        commit()",
    )

    expect(statementsIn(source, "run")).toStrictEqual([
      "loop for job in jobs",
      "  each of jobs",
      "    conditional if job.done",
      "      then of job.done",
      "        jump continue",
      "    expression job.start()",
      "loop while jobs.pending()",
      "  body of jobs.pending()",
      "    jump break",
      "try try",
      "  try",
      "    expression flush()",
      "  catch",
      "    expression retry()",
      "  finally",
      "    expression close()",
      "expression with lock()",
      "  expression commit()",
    ])
  })

  it("names each case of a match after its pattern", () => {
    const source = sourceOf(
      "def label(kind):",
      "    match kind:",
      "        case \"new\":",
      "            return 1",
      "        case _:",
      "            return 0",
    )

    expect(statementsIn(source, "label")).toStrictEqual([
      "conditional match kind",
      "  case \"new\"",
      "    return return 1",
      "  case _",
      "    return return 0",
    ])
  })

  it("reads a decorated function as one declaration from its first decorator, and the methods of a class as declarations", () => {
    const source = sourceOf(
      "class Cart:",
      "    @property",
      "    def total(self):",
      "        return self.subtotal() and self.tax()",
      "    def tax(self):",
      "        return 0",
    )

    expect(statementsIn(source, "Cart")).toStrictEqual([
      "declaration @property",
      "  return return self.subtotal() and self.tax()",
      "    then of self.subtotal()",
      "declaration def tax(self)",
      "  return return 0",
    ])
  })

  it("leaves an import and a type alias out of the statements that run", () => {
    const source = sourceOf("import os", "from shop import pricing", "type Price = int", "start()")

    expect(fileOf(source).listTopLevelStatements().flatMap((statement) => describeStatement(statement))).toStrictEqual(["expression start()"])
  })
})
