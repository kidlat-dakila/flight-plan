import type { SyntaxNode } from "@/ast-graph/parser"
import { rangeOf } from "@/ast-graph/source-range"
import type { ArmRole, Statement, StatementArm, StatementType } from "@/ast-graph/types"

export interface FoundStatement {
  readonly kind: "statement"
  readonly node: SyntaxNode
  readonly type: StatementType
  readonly text: string
}

export interface FoundArm {
  readonly kind: "arm"
  readonly node: SyntaxNode
  readonly role: ArmRole
  readonly label: string
  readonly subject: string | null
}

type Found = FoundStatement | FoundArm

interface Placing {
  readonly open: readonly number[]
  readonly parents: readonly number[]
}

const NO_PARENT = -1
const ARM_FIRST = -1
const STATEMENT_FIRST = 1
const NOTHING_PLACED: Placing = { open: [], parents: [] }

const inReadingOrder = (one: Found, two: Found): number => {
  if (one.node.startIndex !== two.node.startIndex) return one.node.startIndex - two.node.startIndex
  if (one.node.endIndex !== two.node.endIndex) return two.node.endIndex - one.node.endIndex
  if (one.kind === two.kind) return 0
  return one.kind === "arm" ? ARM_FIRST : STATEMENT_FIRST
}

const holds = (outer: Found, inner: Found): boolean =>
  outer.node.startIndex <= inner.node.startIndex && inner.node.endIndex <= outer.node.endIndex

const placeIn = (found: readonly Found[]) => ({ open, parents }: Placing, item: Found, index: number): Placing => {
  const stillOpen = open.filter((holder) => holds(found[holder], item))
  return { open: [...stillOpen, index], parents: [...parents, stillOpen.length === 0 ? NO_PARENT : stillOpen[stillOpen.length - 1]] }
}

export const nestStatements = (statements: readonly FoundStatement[], arms: readonly FoundArm[]): Statement[] => {
  const found = [...statements, ...arms].sort(inReadingOrder)
  const { parents } = found.reduce(placeIn(found), NOTHING_PLACED)
  const childrenOf = (parent: number): number[] => parents.flatMap((holder, index) => (holder === parent ? [index] : []))
  const statementsUnder = (parent: number): Statement[] =>
    childrenOf(parent).flatMap((index) => {
      const item = found[index]
      return item.kind === "statement" ? [toStatement(item, index)] : []
    })
  const armsUnder = (parent: number): StatementArm[] =>
    childrenOf(parent).flatMap((index) => {
      const item = found[index]
      return item.kind === "arm" ? [toArm(item, index)] : []
    })
  const toStatement = ({ node, type, text }: FoundStatement, index: number): Statement => ({
    type,
    text,
    range: rangeOf(node),
    arms: armsUnder(index),
    statements: statementsUnder(index),
  })
  const toArm = ({ node, role, label, subject }: FoundArm, index: number): StatementArm => ({
    role,
    label,
    subject,
    range: rangeOf(node),
    arms: armsUnder(index),
    statements: statementsUnder(index),
  })
  return statementsUnder(NO_PARENT)
}
