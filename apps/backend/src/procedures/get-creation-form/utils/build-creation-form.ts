import type { StartForm } from "@/procedures/get-review/utils/schemas"
import type { TargetOption } from "@/procedures/search-creation-targets/utils/schemas"
import type { CreationForm } from "./schemas"

export interface CreationFormSource {
  readonly repositoryName: string
  readonly startForm: StartForm
  readonly selectedTarget: TargetOption | null
}

const SUBMIT_LABEL = "Start"

const INITIALIZATION_OPTIONS: CreationForm["initialization"]["options"] = [
  {
    kind: "draft",
    label: "Let an agent draft it",
    description: "Flight Plan builds the structure and an agent writes every part.",
    authorWriting: null,
  },
  {
    kind: "scaffold",
    label: "Generate review Flight Plan artifact only",
    description: "Flight Plan builds the segments, the diagrams and the Code Walkthrough. No agent writes them.",
    authorWriting: { start: "scaffold", submitLabel: SUBMIT_LABEL },
  },
  {
    kind: "empty",
    label: "Start empty",
    description: "A Flight Plan with no segments. Nothing is generated.",
    authorWriting: { start: "empty", submitLabel: SUBMIT_LABEL },
  },
]

const withSubmitLabel = (startForm: StartForm): StartForm => ({
  ...startForm,
  writer: {
    ...startForm.writer,
    agents: startForm.writer.agents.map((agent) => ({ ...agent, submitLabel: SUBMIT_LABEL })),
    manual: { ...startForm.writer.manual, submitLabel: SUBMIT_LABEL },
  },
})

export const buildCreationForm = ({ repositoryName, startForm, selectedTarget }: CreationFormSource): CreationForm => ({
  title: "Create a Flight Plan",
  description: `For a pull request or a branch of ${repositoryName}.`,
  target: {
    label: "Pull request or branch",
    hint: "Your open pull requests come first, then the two branches with the latest commits.",
    placeholder: "Search by title, number or branch",
    selected: selectedTarget,
  },
  initialization: {
    legend: "How it starts",
    selectedKind: "draft",
    options: INITIALIZATION_OPTIONS,
  },
  form: withSubmitLabel(startForm),
  pendingLabel: startForm.pendingLabel,
})
