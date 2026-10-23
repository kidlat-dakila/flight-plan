import type { TroubleshootForm } from "./schemas"

export interface TroubleshootFormFacts {
  readonly agentLabel: string | null
  readonly errorMessage: string | null
}

export const TROUBLESHOOTING_AGENT_LABEL = "Claude"

export const NO_AGENT_PROBLEM = `Flight Plan can start only ${TROUBLESHOOTING_AGENT_LABEL} to troubleshoot. Add ${TROUBLESHOOTING_AGENT_LABEL} in Settings, under Agents, and try again.`

const introOf = (agentLabel: string, hasError: boolean): string =>
  hasError
    ? `Flight Plan will launch ${agentLabel} in a terminal to troubleshoot this error. ${agentLabel} reads the error and Flight Plan's docs, then suggests a fix.`
    : `Tell Flight Plan what went wrong, and it will launch ${agentLabel} in a terminal to troubleshoot it. ${agentLabel} reads Flight Plan's logs and docs, then suggests a fix.`

const privacyNoteOf = (agentLabel: string): string =>
  `The logs stay on this computer. If ${agentLabel} finds a bug in Flight Plan, it asks you before anything is posted, and it never posts your code or your personal details.`

export const buildTroubleshootForm = ({ agentLabel, errorMessage }: TroubleshootFormFacts): TroubleshootForm => {
  const label = agentLabel ?? TROUBLESHOOTING_AGENT_LABEL
  const hasError = errorMessage !== null
  return {
    title: "Troubleshoot",
    intro: introOf(label, hasError),
    error: errorMessage === null ? null : { label: "The error", message: errorMessage },
    description: hasError
      ? { label: "What were you doing when it happened?", placeholder: "Optional. A sentence or two helps.", isRequired: false }
      : { label: "What went wrong?", placeholder: "Say what you did and what happened.", isRequired: true },
    privacyNote: privacyNoteOf(label),
    problem: agentLabel === null ? NO_AGENT_PROBLEM : null,
    launchLabel: `Launch ${label}`,
    cancelLabel: "Cancel",
    closeLabel: "Close",
    manual: { label: "Run this command in a terminal", copyLabel: "Copy command", copiedMessage: "Command copied" },
  }
}
