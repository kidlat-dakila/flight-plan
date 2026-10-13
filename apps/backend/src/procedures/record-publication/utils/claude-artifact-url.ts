const CLAUDE_HOST = "claude.ai"
const SECURE_PROTOCOL = "https:"
const ARTIFACT_PATH_PATTERN = /^\/(?:code\/)?artifact\/[^/]+$/u

export const isClaudeArtifactUrl = (url: string): boolean => {
  if (!URL.canParse(url)) return false
  const { protocol, hostname, pathname } = new URL(url)
  return protocol === SECURE_PROTOCOL && hostname === CLAUDE_HOST && ARTIFACT_PATH_PATTERN.test(pathname)
}
