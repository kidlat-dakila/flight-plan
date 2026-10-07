import type { Statement, StatementArm } from "@/ast-graph"
import { SCRIPT_DIALECTS, sourceOf } from "@/ast-graph/languages/__tests__/script-files"

const INDENT = "  "

const describeArm = (arm: StatementArm, indent: string): string[] => [
  `${indent}${arm.label}${arm.subject === null ? "" : ` [${arm.subject}]`}:`,
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

describe.each(SCRIPT_DIALECTS)("the statements %s reads", (_name, { fileOf }) => {
  const statementsIn = (source: string, name: string): string[] => {
    const file = fileOf(source)
    const encapsulation = file.listRootEncapsulations().find((candidate) => candidate.name === name)
    return encapsulation === undefined ? [] : file.listStatements(encapsulation).flatMap((statement) => describeStatement(statement))
  }

  const topLevelIn = (source: string): string[] => fileOf(source).listTopLevelStatements().flatMap((statement) => describeStatement(statement))

  it("lists the statements of a function in order, each with its type and its first line", () => {
    const source = sourceOf(
      "export function place(order) {",
      "  const total = totalOf(order)",
      "  save(order, total)",
      "  if (total === 0) {",
      "    throw new Error(\"empty\")",
      "  }",
      "  return total",
      "}",
    )

    expect(statementsIn(source, "place")).toStrictEqual([
      "declaration const total = totalOf(order)",
      "expression save(order, total)",
      "conditional if (total === 0)",
      "  then [total === 0]:",
      "    throw throw new Error(\"empty\")",
      "return return total",
    ])
  })

  it("lists both arms of a conditional and an else that holds another conditional", () => {
    const source = sourceOf(
      "function grade(score) {",
      "  if (score > 90) {",
      "    return \"a\"",
      "  } else if (score > 80) return \"b\"",
      "  else {",
      "    return \"c\"",
      "  }",
      "}",
    )

    expect(statementsIn(source, "grade")).toStrictEqual([
      "conditional if (score > 90)",
      "  then [score > 90]:",
      "    return return \"a\"",
      "  else [score > 90]:",
      "    conditional if (score > 80) return \"b\"",
      "      then [score > 80]:",
      "        return return \"b\"",
      "      else [score > 80]:",
      "        return return \"c\"",
    ])
  })

  it("lists the cases of a switch", () => {
    const source = sourceOf(
      "function label(kind) {",
      "  switch (kind) {",
      "    case \"bug\":",
      "      return \"Bug\"",
      "    default:",
      "      return \"Other\"",
      "  }",
      "}",
    )

    expect(statementsIn(source, "label")).toStrictEqual([
      "conditional switch (kind)",
      "  case \"bug\":",
      "    return return \"Bug\"",
      "  default:",
      "    return return \"Other\"",
    ])
  })

  it("lists the body of each kind of loop with what it runs over", () => {
    const source = sourceOf(
      "function run(items) {",
      "  for (const item of items) {",
      "    visit(item)",
      "  }",
      "  while (queue.length > 0) {",
      "    drain(queue)",
      "  }",
      "  items.forEach((item) => {",
      "    close(item)",
      "  })",
      "}",
    )

    expect(statementsIn(source, "run")).toStrictEqual([
      "loop for (const item of items)",
      "  each [items]:",
      "    expression visit(item)",
      "loop while (queue.length > 0)",
      "  body [queue.length > 0]:",
      "    expression drain(queue)",
      "expression items.forEach((item) =>",
      "  each [items]:",
      "    expression close(item)",
    ])
  })

  it("lists the arms of a try", () => {
    const source = sourceOf("function load() {", "  try {", "    read()", "  } catch (error) {", "    report(error)", "  } finally {", "    close()", "  }", "}")

    expect(statementsIn(source, "load")).toStrictEqual([
      "try try",
      "  try:",
      "    expression read()",
      "  catch:",
      "    expression report(error)",
      "  finally:",
      "    expression close()",
    ])
  })

  it("lists the arms of a conditional expression and of a short circuit", () => {
    const source = sourceOf("function pick(user) {", "  const name = user ? nameOf(user) : guestName()", "  return user && greet(name)", "}")

    expect(statementsIn(source, "pick")).toStrictEqual([
      "declaration const name = user ? nameOf(user) : guestName()",
      "  then [user]:",
      "  else [user]:",
      "return return user && greet(name)",
      "  then [user]:",
    ])
  })

  it("reads the expression an arrow function returns as its one statement", () => {
    expect(statementsIn("export const totalOf = (order) => roundOnce(sum(order.lines))", "totalOf")).toStrictEqual(["return roundOnce(sum(order.lines))"])
  })

  it("nests the statements of a function declared inside another under its declaration", () => {
    const source = sourceOf("function page() {", "  const handle = (id) => {", "    remove(id)", "  }", "  return handle", "}")

    expect(statementsIn(source, "page")).toStrictEqual(["declaration const handle = (id) =>", "  expression remove(id)", "return return handle"])
  })

  it("lists each method of a class with its statements", () => {
    const source = sourceOf("class Cart {", "  add(item) {", "    this.items.push(item)", "  }", "}")

    expect(statementsIn(source, "Cart")).toStrictEqual(["declaration add(item)", "  expression this.items.push(item)"])
  })

  it("lists the top level statements that run, without imports, types, export lists and declarations", () => {
    const source = sourceOf(
      "import { rateLimit } from \"./rate-limit\"",
      "",
      "export interface Options { perMinute: number }",
      "type Limit = number",
      "const app = createApp()",
      "",
      "app.use(rateLimit({ perMinute: 60 }))",
      "if (isDevelopment) {",
      "  app.use(devTools())",
      "}",
      "export { app }",
      "export default app",
    )

    expect(topLevelIn(source)).toStrictEqual([
      "expression app.use(rateLimit({ perMinute: 60 }))",
      "conditional if (isDevelopment)",
      "  then [isDevelopment]:",
      "    expression app.use(devTools())",
    ])
  })

  it("says a name in an export list or a default export of a name is not run", () => {
    const source = sourceOf("const app = createApp()", "export { app }", "export default app")
    const file = fileOf(source)
    const ranges = [2, 3].map((line) => ({ start: { line, column: 0 }, end: { line, column: 5 } }))

    expect(ranges.map((exported) => file.isRunAt(exported))).toStrictEqual([false, false])
  })
})
