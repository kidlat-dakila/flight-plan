import type { ArgumentSite } from "@/ast-graph"

const MEMBER_SEPARATOR = "."
const HANDLER_ATTRIBUTE = /^on[A-Z]/u
const LISTENING_METHOD = "addEventListener"

const methodOf = (callee: string): string | null => {
  const names = callee.split(MEMBER_SEPARATOR)
  return names.length > 1 ? names[names.length - 1] : null
}

export const isHandlerAttribute = (attribute: string): boolean => HANDLER_ATTRIBUTE.test(attribute)

export const isListener = ({ callee }: ArgumentSite): boolean => methodOf(callee) === LISTENING_METHOD

export const listenerTargetOf = ({ callee }: ArgumentSite): string => callee.slice(0, callee.lastIndexOf(MEMBER_SEPARATOR))
