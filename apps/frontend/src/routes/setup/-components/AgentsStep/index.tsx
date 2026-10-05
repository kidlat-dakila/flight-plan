import { useId, useState } from "react"
import Button from "@flightplan/ui/blocks/button"
import Input from "@flightplan/ui/blocks/input"
import FolderBrowserDialog, { type FolderBrowser } from "@flightplan/ui/FolderBrowserDialog"
import { cn } from "@flightplan/ui/lib/utils"
import StepActions, { type StepProblem } from "@/routes/setup/-components/StepActions"
import StepIntro from "@/routes/setup/-components/StepIntro"

type AgentName = "claude" | "codex" | "cursor"

type AgentConnection = "direct" | "manual"

interface ModelOption {
  readonly model: string
  readonly label: string
}

interface AgentOption {
  readonly agent: AgentName
  readonly label: string
  readonly isPicked: boolean
  readonly installPath: string
  readonly pathHint: string
  readonly unavailableReason: string | null
  readonly model: string
  readonly modelOptions: readonly ModelOption[]
}

interface ConnectionOption {
  readonly connection: AgentConnection
  readonly label: string
  readonly tagLabel: string | null
  readonly description: string
  readonly unavailableFeatures: readonly string[]
}

export interface AgentsChoice {
  readonly agents: {
    readonly agent: AgentName
    readonly isPicked: boolean
    readonly installPath: string
    readonly model: string
  }[]
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
  readonly folderBrowser: FolderBrowser | null
  readonly folderBrowserErrorMessage: string | null
  readonly onBrowseFolder: (path: string) => void
  readonly onBrowseEnd: () => void
  readonly onSubmit: (choice: AgentsChoice) => void
}

interface AgentRowProps {
  readonly option: AgentOption
  readonly groupName: string
  readonly isPicked: boolean
  readonly isDefault: boolean
  readonly installPath: string
  readonly model: string
  readonly pathErrorMessage: string | null
  readonly modelErrorMessage: string | null
  readonly onPickedChange: (isPicked: boolean) => void
  readonly onDefaultChange: () => void
  readonly onInstallPathChange: (installPath: string) => void
  readonly onModelChange: (model: string) => void
  readonly onBrowse: () => void
}

interface ModelChoiceProps {
  readonly option: AgentOption
  readonly model: string
  readonly errorMessage: string | null
  readonly onModelChange: (model: string) => void
}

const TITLE = "Choose your agents"
const SECTION_HEADING_CLASSES = "pt-8 pb-2 text-xl leading-7 font-bold text-signal-text"
const CHOICE_INPUT_CLASSES = "size-4 shrink-0 accent-(--primary)"
const BROWSER_DESCRIPTION = "Open folders until you reach the one to install into, then use it."

const MODEL_FIELD = "model"

const ignoreRepository = () => undefined

const ModelChoice = ({ option, model, errorMessage, onModelChange }: ModelChoiceProps) => {
  const groupId = useId()
  const errorId = useId()
  return (
    <fieldset className="grid gap-1.5" aria-describedby={errorMessage === null ? undefined : errorId}>
      <legend className="pb-1.5 text-sm font-bold">{`Model for ${option.label}`}</legend>
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {option.modelOptions.map((offer) => (
          <label key={offer.model} className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="radio"
              name={groupId}
              checked={model === offer.model}
              className={CHOICE_INPUT_CLASSES}
              onChange={() => { onModelChange(offer.model) }}
            />
            <span className="text-box-cap">{offer.label}</span>
          </label>
        ))}
      </div>
      {errorMessage === null ? null : <p id={errorId} role="alert" className="text-sm text-destructive">{errorMessage}</p>}
    </fieldset>
  )
}

const AgentRow = ({
  option,
  groupName,
  isPicked,
  isDefault,
  installPath,
  model,
  pathErrorMessage,
  modelErrorMessage,
  onPickedChange,
  onDefaultChange,
  onInstallPathChange,
  onModelChange,
  onBrowse,
}: AgentRowProps) => {
  const pathId = useId()
  const hintId = useId()
  const errorId = useId()
  const hasPathError = pathErrorMessage !== null
  const isAvailable = option.unavailableReason === null
  return (
    <li className="border-b border-border py-3">
      <div className="flex items-start gap-4">
        <label className={cn("flex min-w-0 flex-1 items-start gap-3", isAvailable ? "cursor-pointer" : "")}>
          <input
            type="checkbox"
            checked={isPicked}
            disabled={!isAvailable}
            className={`${CHOICE_INPUT_CLASSES} mt-0.5`}
            onChange={(event) => { onPickedChange(event.target.checked) }}
          />
          <span className="min-w-0">
            <span className="font-bold">{option.label}</span>
            {option.unavailableReason === null
              ? null
              : (
                  <span className="block max-w-[62ch] text-sm text-destructive">
                    <span className="font-bold">Unavailable.</span>
                    {` ${option.unavailableReason}`}
                  </span>
                )}
          </span>
        </label>
        <label className="flex cursor-pointer items-center gap-2 pt-0.5 text-sm has-disabled:cursor-default has-disabled:text-muted-foreground">
          <input
            type="radio"
            name={groupName}
            checked={isDefault}
            disabled={!isPicked}
            className={CHOICE_INPUT_CLASSES}
            onChange={onDefaultChange}
          />
          <span aria-hidden="true" className="text-box-cap">Default</span>
          <span className="sr-only">{`Default agent: ${option.label}`}</span>
        </label>
      </div>
      {isPicked
        ? (
            <div className="mt-3 grid gap-1.5 pl-7">
              <label htmlFor={pathId} className="text-sm font-bold">{`Install folder for ${option.label}`}</label>
              <p id={hintId} className="text-sm text-muted-foreground">{option.pathHint}</p>
              <div className="flex max-w-xl items-center gap-2">
                <Input
                  id={pathId}
                  value={installPath}
                  autoComplete="off"
                  spellCheck={false}
                  aria-invalid={hasPathError}
                  aria-describedby={hasPathError ? `${hintId} ${errorId}` : hintId}
                  className="min-w-0 flex-1 font-mono"
                  onChange={(event) => { onInstallPathChange(event.target.value) }}
                />
                <Button
                  type="button"
                  variant="outline"
                  aria-label={`Browse for the ${option.label} install folder`}
                  onClick={onBrowse}
                >
                  Browse
                </Button>
              </div>
              {hasPathError ? <p id={errorId} role="alert" className="text-sm text-destructive">{pathErrorMessage}</p> : null}
              <div className="pt-3">
                <ModelChoice option={option} model={model} errorMessage={modelErrorMessage} onModelChange={onModelChange} />
              </div>
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
  folderBrowser,
  folderBrowserErrorMessage,
  onBrowseFolder,
  onBrowseEnd,
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
  const [modelByAgent, setModelByAgent] = useState<Record<string, string>>(() =>
    Object.fromEntries(agents.map((option) => [option.agent, option.model])),
  )
  const [chosenDefault, setChosenDefault] = useState(defaultAgent)
  const [chosenConnection, setChosenConnection] = useState(connection)
  const [browsingOption, setBrowsingOption] = useState<AgentOption | null>(null)

  const handleBrowse = (option: AgentOption) => {
    setBrowsingOption(option)
    onBrowseFolder(pathByAgent[option.agent] ?? "")
  }

  const handleBrowseEnd = () => {
    setBrowsingOption(null)
    onBrowseEnd()
  }

  const handleFolderChosen = (installPath: string) => {
    if (browsingOption !== null) setPathByAgent((paths) => ({ ...paths, [browsingOption.agent]: installPath }))
    handleBrowseEnd()
  }

  const handleSubmit = () => {
    onSubmit({
      agents: agents.map((option) => ({
        agent: option.agent,
        isPicked: pickedByAgent[option.agent] ?? false,
        installPath: pathByAgent[option.agent] ?? "",
        model: modelByAgent[option.agent] ?? option.model,
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
            model={modelByAgent[option.agent] ?? option.model}
            pathErrorMessage={
              problem?.field?.owner === option.agent && problem.field.name !== MODEL_FIELD ? problem.message : null
            }
            modelErrorMessage={
              problem?.field?.owner === option.agent && problem.field.name === MODEL_FIELD ? problem.message : null
            }
            onPickedChange={(isPicked) => { setPickedByAgent((picked) => ({ ...picked, [option.agent]: isPicked })) }}
            onDefaultChange={() => { setChosenDefault(option.agent) }}
            onInstallPathChange={(installPath) => {
              setPathByAgent((paths) => ({ ...paths, [option.agent]: installPath }))
            }}
            onModelChange={(chosenModel) => {
              setModelByAgent((models) => ({ ...models, [option.agent]: chosenModel }))
            }}
            onBrowse={() => { handleBrowse(option) }}
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
      <FolderBrowserDialog
        isOpen={browsingOption !== null}
        title={`Install folder for ${browsingOption?.label ?? ""}`}
        description={BROWSER_DESCRIPTION}
        browser={folderBrowser}
        errorMessage={folderBrowserErrorMessage}
        onOpenFolder={onBrowseFolder}
        onChooseRepository={ignoreRepository}
        onChooseFolder={handleFolderChosen}
        onClose={handleBrowseEnd}
      />
    </form>
  )
}

export default AgentsStep
