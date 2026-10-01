import { useId, useState } from "react"
import Input from "@flightplan/ui/blocks/input"
import StepActions, { type StepProblem } from "@/routes/setup/-components/StepActions"
import StepIntro from "@/routes/setup/-components/StepIntro"

type AgentName = "claude" | "codex" | "cursor"

type AgentConnection = "direct" | "manual"

interface AgentOption {
  readonly agent: AgentName
  readonly label: string
  readonly isPicked: boolean
  readonly installPath: string
  readonly pathHint: string
}

interface ConnectionOption {
  readonly connection: AgentConnection
  readonly label: string
  readonly tagLabel: string | null
  readonly description: string
  readonly unavailableFeatures: readonly string[]
}

export interface AgentsChoice {
  readonly agents: { readonly agent: AgentName, readonly isPicked: boolean, readonly installPath: string }[]
  readonly defaultAgent: AgentName | null
  readonly connection: AgentConnection
}

interface AgentsStepProps {
  readonly agents: readonly AgentOption[]
  readonly defaultAgent: AgentName | null
  readonly connection: AgentConnection
  readonly connectionOptions: readonly ConnectionOption[]
  readonly backStep: string | null
  readonly problem: StepProblem | null
  readonly isPending: boolean
  readonly onSubmit: (choice: AgentsChoice) => void
}

interface AgentRowProps {
  readonly option: AgentOption
  readonly groupName: string
  readonly isPicked: boolean
  readonly isDefault: boolean
  readonly installPath: string
  readonly pathErrorMessage: string | null
  readonly onPickedChange: (isPicked: boolean) => void
  readonly onDefaultChange: () => void
  readonly onInstallPathChange: (installPath: string) => void
}

const TITLE = "Choose your agents"
const SECTION_HEADING_CLASSES = "pt-8 pb-2 text-lg leading-7 font-bold"
const CHOICE_INPUT_CLASSES = "size-4 shrink-0 accent-(--primary)"

const AgentRow = ({
  option,
  groupName,
  isPicked,
  isDefault,
  installPath,
  pathErrorMessage,
  onPickedChange,
  onDefaultChange,
  onInstallPathChange,
}: AgentRowProps) => {
  const pathId = useId()
  const hintId = useId()
  const errorId = useId()
  const hasPathError = pathErrorMessage !== null
  return (
    <li className="border-b border-border py-3">
      <div className="flex items-center gap-4">
        <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={isPicked}
            className={CHOICE_INPUT_CLASSES}
            onChange={(event) => { onPickedChange(event.target.checked) }}
          />
          <span className="font-bold">{option.label}</span>
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm has-disabled:cursor-default has-disabled:text-muted-foreground">
          <input
            type="radio"
            name={groupName}
            checked={isDefault}
            disabled={!isPicked}
            className={CHOICE_INPUT_CLASSES}
            onChange={onDefaultChange}
          />
          <span aria-hidden="true">Default</span>
          <span className="sr-only">{`Default agent: ${option.label}`}</span>
        </label>
      </div>
      {isPicked
        ? (
            <div className="mt-3 grid gap-1.5 pl-7">
              <label htmlFor={pathId} className="text-sm font-bold">{`Install folder for ${option.label}`}</label>
              <p id={hintId} className="text-sm text-muted-foreground">{option.pathHint}</p>
              <Input
                id={pathId}
                value={installPath}
                autoComplete="off"
                spellCheck={false}
                aria-invalid={hasPathError}
                aria-describedby={hasPathError ? `${hintId} ${errorId}` : hintId}
                className="max-w-xl font-mono"
                onChange={(event) => { onInstallPathChange(event.target.value) }}
              />
              {hasPathError ? <p id={errorId} role="alert" className="text-sm text-destructive">{pathErrorMessage}</p> : null}
            </div>
          )
        : null}
    </li>
  )
}

const AgentsStep = ({
  agents,
  defaultAgent,
  connection,
  connectionOptions,
  backStep,
  problem,
  isPending,
  onSubmit,
}: AgentsStepProps) => {
  const defaultGroupId = useId()
  const connectionGroupId = useId()
  const [pickedByAgent, setPickedByAgent] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(agents.map((option) => [option.agent, option.isPicked])),
  )
  const [pathByAgent, setPathByAgent] = useState<Record<string, string>>(() =>
    Object.fromEntries(agents.map((option) => [option.agent, option.installPath])),
  )
  const [chosenDefault, setChosenDefault] = useState(defaultAgent)
  const [chosenConnection, setChosenConnection] = useState(connection)

  const handleSubmit = () => {
    onSubmit({
      agents: agents.map((option) => ({
        agent: option.agent,
        isPicked: pickedByAgent[option.agent] ?? false,
        installPath: pathByAgent[option.agent] ?? "",
      })),
      defaultAgent: chosenDefault,
      connection: chosenConnection,
    })
  }

  return (
    <form action={handleSubmit}>
      <StepIntro title={TITLE}>
        A coding agent writes each review. Pick every agent you use. Flight Plan installs its skills, its plugin and its
        MCP server into the folder of each agent you pick.
      </StepIntro>
      <ul className="border-t border-border">
        {agents.map((option) => (
          <AgentRow
            key={option.agent}
            option={option}
            groupName={defaultGroupId}
            isPicked={pickedByAgent[option.agent] ?? false}
            isDefault={chosenDefault === option.agent}
            installPath={pathByAgent[option.agent] ?? ""}
            pathErrorMessage={problem?.field?.owner === option.agent ? problem.message : null}
            onPickedChange={(isPicked) => { setPickedByAgent((picked) => ({ ...picked, [option.agent]: isPicked })) }}
            onDefaultChange={() => { setChosenDefault(option.agent) }}
            onInstallPathChange={(installPath) => {
              setPathByAgent((paths) => ({ ...paths, [option.agent]: installPath }))
            }}
          />
        ))}
      </ul>
      <fieldset>
        <legend className={SECTION_HEADING_CLASSES}>How Flight Plan reaches the agent</legend>
        <ul className="border-t border-border">
          {connectionOptions.map((option) => (
            <li key={option.connection} className="border-b border-border py-3 last:border-b-0">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="radio"
                  name={connectionGroupId}
                  checked={chosenConnection === option.connection}
                  className={`${CHOICE_INPUT_CLASSES} mt-1`}
                  onChange={() => { setChosenConnection(option.connection) }}
                />
                <span className="min-w-0">
                  <span className="font-bold">{option.label}</span>
                  {option.tagLabel === null
                    ? null
                    : <span className="ml-2 text-sm text-muted-foreground">{option.tagLabel}</span>}
                  <span className="block max-w-[62ch] text-sm text-muted-foreground">{option.description}</span>
                </span>
              </label>
              {option.unavailableFeatures.length > 0
                ? (
                    <div className="mt-2 pl-7 text-sm">
                      <p>Not available when you prompt the agent yourself:</p>
                      <ul className="list-disc pl-5 text-muted-foreground">
                        {option.unavailableFeatures.map((feature) => <li key={feature}>{feature}</li>)}
                      </ul>
                    </div>
                  )
                : null}
            </li>
          ))}
        </ul>
      </fieldset>
      <StepActions
        backStep={backStep}
        submitLabel="Save and continue"
        pendingLabel="Saving…"
        isPending={isPending}
        errorMessage={problem !== null && problem.field === null ? problem.message : null}
      />
    </form>
  )
}

export default AgentsStep
