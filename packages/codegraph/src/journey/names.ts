import type { CodeBlock, CodeBlockSymbol, CodeBlockType } from "@flightplan/configurations"

export const BLOCK_TYPE_LABELS: Readonly<Record<CodeBlockType, string>> = {
  "function": "Function",
  "method": "Method",
  "hook": "Hook",
  "component": "Component",
  "class": "Class",
  "root-variable": "Variable",
  "root-statement": "Statement",
  "type-declaration": "Type",
  "import": "Import",
  "file": "File",
  "condition": "Condition",
  "switch": "Switch",
  "switch-case": "Case",
  "loop": "Loop",
  "try-catch": "Try",
  "throw": "Throw",
  "call": "Call",
  "effect": "Effect",
  "component-effect": "Effect",
  "effect-callback": "Callback",
  "code-event": "Event",
  "route": "Route",
  "resolver": "Resolver",
  "middleware": "Middleware",
  "render": "Markup",
  "render-condition": "Markup condition",
  "render-loop": "Markup loop",
  "render-event": "Event",
  "render-root": "Markup",
  "state": "State",
  "derived": "Derived",
  "data": "Data",
  "data-fetch": "Data fetch",
  "cache": "Cache",
  "auth": "Auth",
  "request": "Request",
  "navigation": "Navigation",
  "publish": "Publish",
  "validation": "Validation",
  "config": "Config",
  "feature-flag": "Feature flag",
  "storage": "Storage",
  "telemetry": "Telemetry",
  "transaction": "Transaction",
  "external-value": "Value",
  "root-argument-value": "Argument",
  "variable": "Local variable",
  "property": "Property",
  "deleted": "Deleted code",
}

const EVENT: CodeBlockType = "render-event"
const ELEMENT: CodeBlockType = "render"
const ARGUMENT: CodeBlockType = "root-argument-value"
const NAME_SEPARATOR = "."
const CALL: CodeBlockSymbol["use"] = "call"
const EFFECT_TYPES: ReadonlySet<CodeBlockType> = new Set<CodeBlockType>(["effect", "component-effect", "effect-callback"])

const calledNameOf = (symbol: CodeBlockSymbol): string | null => {
  if (symbol.use !== CALL) return null
  if (symbol.type === "unopened-import") return symbol.importedName
  return symbol.type === "internal-code-block" || symbol.type === "external-block" ? (symbol.codeBlockReference.name ?? null) : null
}

export const calledNamesOf = (block: CodeBlock): string[] => block.outerSymbols.flatMap((symbol) => calledNameOf(symbol) ?? [])

const effectNameOf = (block: CodeBlock): string | null => {
  if (!EFFECT_TYPES.has(block.type) || block.name !== undefined) return null
  const calledNames = calledNamesOf(block)
  return calledNames.length === 0 ? null : calledNames[0]
}

const elementNameOf = (event: CodeBlock): string | null => (event.parentBlock?.type === ELEMENT ? (event.parentBlock.name ?? null) : null)

const holderNameOf = (block: CodeBlock): string | null => {
  if (block.type === EVENT) return elementNameOf(block)
  return block.type === ARGUMENT && block.parentBlock?.type === ARGUMENT ? nameOfBlock(block.parentBlock) : null
}

export const nameOfBlock = (block: CodeBlock): string => {
  const written = effectNameOf(block) ?? block.name ?? block.catalogue?.name ?? null
  if (written === null) return `${BLOCK_TYPE_LABELS[block.type]} :${String(block.lineOfCodeRangeReference[0].start.line)}`
  const holder = holderNameOf(block)
  return holder === null ? written : [holder, written].join(NAME_SEPARATOR)
}
