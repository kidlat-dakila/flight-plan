import type { CodeBlock, CodeBlockType } from "@flightplan/configurations"

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

const elementNameOf = (event: CodeBlock): string | null => (event.parentBlock?.type === ELEMENT ? (event.parentBlock.name ?? null) : null)

const holderNameOf = (block: CodeBlock): string | null => {
  if (block.type === EVENT) return elementNameOf(block)
  return block.type === ARGUMENT && block.parentBlock?.type === ARGUMENT ? nameOfBlock(block.parentBlock) : null
}

export const nameOfBlock = (block: CodeBlock): string => {
  const written = block.name ?? block.catalogue?.name ?? null
  if (written === null) return `${BLOCK_TYPE_LABELS[block.type]} :${String(block.lineOfCodeRangeReference[0].start.line)}`
  const holder = holderNameOf(block)
  return holder === null ? written : [holder, written].join(NAME_SEPARATOR)
}
