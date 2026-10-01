export interface CodeReferenceParts {
  readonly repositoryName: string
  readonly commit: string
  readonly path: string
  readonly lineStart: number
  readonly lineEnd: number
}

export const formatCodeReference = (parts: CodeReferenceParts): string => {
  const first = Math.min(parts.lineStart, parts.lineEnd)
  const last = Math.max(parts.lineStart, parts.lineEnd)
  const lines = first === last ? `#L${String(first)}` : `#L${String(first)}-${String(last)}`
  return `${parts.repositoryName}@${parts.commit}:${parts.path}${lines}`
}
