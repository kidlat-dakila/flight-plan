import type { Environment } from "@/procedures/get-setup/utils/agent-folders"

const PARENT_SESSION_VARIABLES: ReadonlySet<string> = new Set([
  "CLAUDECODE",
  "CLAUDE_AGENT_SDK_VERSION",
  "CLAUDE_CODE_CHILD_SESSION",
  "CLAUDE_CODE_EMIT_STARTUP_TIMING",
  "CLAUDE_CODE_ENABLE_SDK_FILE_CHECKPOINTING",
  "CLAUDE_CODE_ENABLE_TASKS",
  "CLAUDE_CODE_ENTRYPOINT",
  "CLAUDE_CODE_EXECPATH",
  "CLAUDE_CODE_MESSAGING_SOCKET",
  "CLAUDE_CODE_MESSAGING_TOKEN",
  "CLAUDE_CODE_QUESTION_PREVIEW_FORMAT",
  "CLAUDE_CODE_SESSION_ATTENDED",
  "CLAUDE_CODE_SESSION_ID",
  "CLAUDE_EFFORT",
  "CLAUDE_PID",
  "MCP_CONNECTION_NONBLOCKING",
])

export const withoutParentSession = (environment: Environment): Environment =>
  Object.fromEntries(Object.entries(environment).filter(([name]) => !PARENT_SESSION_VARIABLES.has(name)))
