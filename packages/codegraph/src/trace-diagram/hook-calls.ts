import type { CodeBlock, CodeBlockType } from "@flightplan/configurations"

const HOOK_CALL: CodeBlockType = "component-effect"
const CALLBACK: CodeBlockType = "effect-callback"
const EFFECT_RUN = "effect"
const MEMO_CALL_NAMES: ReadonlySet<string> = new Set(["useMemo", "useCallback", "computed"])
const MEMO_HOLDER_TYPES: ReadonlySet<CodeBlockType> = new Set<CodeBlockType>(["derived", "external-value", "variable"])

export const callbacksOf = (call: CodeBlock): CodeBlock[] => call.childrenBlocks.filter((child) => child.type === CALLBACK)

export const isEffectHookBlock = (block: CodeBlock): boolean =>
  block.type === HOOK_CALL && callbacksOf(block).some((callback) => callback.catalogue?.runs === EFFECT_RUN)

export const memoCallOf = (block: CodeBlock): CodeBlock | null => {
  if (!MEMO_HOLDER_TYPES.has(block.type)) return null
  return block.childrenBlocks.find((child) => child.type === HOOK_CALL && MEMO_CALL_NAMES.has(child.catalogue?.name ?? "")) ?? null
}

export const isMemoBlock = (block: CodeBlock): boolean => memoCallOf(block) !== null

export const hookCallOf = (block: CodeBlock): CodeBlock | null => (isEffectHookBlock(block) ? block : memoCallOf(block))

export const isHookCallBlock = (block: CodeBlock): boolean => hookCallOf(block) !== null

export const isMergedCallback = (block: CodeBlock): boolean => block.type === CALLBACK && block.parentBlock !== null && isEffectHookBlock(block.parentBlock)

export const isInsideMemo = (block: CodeBlock): boolean => block.parentBlock !== null && (isMemoBlock(block.parentBlock) || isInsideMemo(block.parentBlock))

export const isSourceCallback = (callback: CodeBlock, call: CodeBlock): boolean => isEffectHookBlock(call) && callback.catalogue?.runs !== EFFECT_RUN
