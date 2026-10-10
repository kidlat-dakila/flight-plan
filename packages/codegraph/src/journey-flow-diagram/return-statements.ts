import type { ASTGraphFile, Encapsulation, Statement, StatementArm } from "@/ast-graph"

const BRANCHING_TYPES: ReadonlySet<Statement["type"]> = new Set<Statement["type"]>(["conditional", "loop", "try"])
const RETURN_TYPE: Statement["type"] = "return"

type Nesting = Pick<Statement, "statements" | "arms">

const listArms = ({ arms }: Pick<Nesting, "arms">): StatementArm[] => arms.flatMap((arm) => [arm, ...listArms(arm)])

const listBranchStatements = (holder: Nesting): Statement[] => [...holder.statements, ...listArms(holder).flatMap((arm) => arm.statements)]

const listOwnReturns = (statements: readonly Statement[]): Statement[] =>
  statements.flatMap((statement) => {
    if (statement.type === RETURN_TYPE) return [statement]
    return BRANCHING_TYPES.has(statement.type) ? listOwnReturns(listBranchStatements(statement)) : []
  })

const inSourceOrder = (statements: readonly Statement[]): Statement[] =>
  [...statements].sort((one, two) => one.range.start.line - two.range.start.line)

export const listReturnStatements = (file: ASTGraphFile, component: Encapsulation): Statement[] =>
  inSourceOrder(listOwnReturns(file.listStatements(component)))
