import { useId, useState, type ReactNode } from "react"
import Button from "@/components/blocks/button"
import Input from "@/components/blocks/input"
import FolderBrowserDialog, { type FolderBrowser } from "@/components/FolderBrowserDialog"
import SegmentedChoice from "@/components/SegmentedChoice"
import SelectField from "@/components/SelectField"
import type { FormProblem } from "@/lib/form-problem"
import { cn } from "@/lib/utils"

type AgentName = "claude" | "codex" | "cursor"

interface ModelOption {
  readonly model: string
  readonly label: string
  readonly hasEffortChoice: boolean
  readonly effortOptions: readonly { readonly effort: string, readonly label: string }[]
  readonly selectedEffort: string
}

interface AgentOption {
  readonly agent: AgentName
  readonly label: string
  readonly isPicked: boolean
  readonly installPath: string
  readonly pathHint: string
  readonly unavailableReason: string | null
  readonly model: string
  readonly effort: string
  readonly modelOptions: readonly ModelOption[]
}

export interface AgentsChoice {
  readonly agents: {
    readonly agent: AgentName
    readonly isPicked: boolean
    readonly installPath: string
    readonly model: string
    readonly effort: string
  }[]
  readonly defaultAgent: AgentName | null
}

interface AgentsFormProps {
  readonly agents: readonly AgentOption[]
  readonly defaultAgent: AgentName | null
  readonly problem: FormProblem | null
  readonly children: ReactNode
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
  readonly effort: string
  readonly pathErrorMessage: string | null
  readonly modelErrorMessage: string | null
  readonly effortErrorMessage: string | null
  readonly onPickedChange: (isPicked: boolean) => void
  readonly onDefaultChange: () => void
  readonly onInstallPathChange: (installPath: string) => void
  readonly onModelChange: (modelOption: ModelOption) => void
  readonly onEffortChange: (effort: string) => void
  readonly onBrowse: () => void
}

const CHOICE_INPUT_CLASSES = "size-4 shrink-0 accent-(--primary)"
const BROWSER_DESCRIPTION = "Open folders until you reach the one to install into, then use it."

const MODEL_FIELD = "model"
const EFFORT_FIELD = "effort"
const SETTING_FIELDS: readonly string[] = [MODEL_FIELD, EFFORT_FIELD]

const ignoreRepository = () => undefined

interface AgentRunSettingsProps {
  readonly option: AgentOption
  readonly model: string
  readonly effort: string
  readonly modelErrorMessage: string | null
  readonly effortErrorMessage: string | null
  readonly onModelChange: (modelOption: ModelOption) => void
  readonly onEffortChange: (effort: string) => void
}

const AgentRunSettings = ({
  option,
  model,
  effort,
  modelErrorMessage,
  effortErrorMessage,
  onModelChange,
  onEffortChange,
}: AgentRunSettingsProps) => {
  const chosenModelOption = option.modelOptions.find((modelOption) => modelOption.model === model)
  return (
    <>
      <div className="flex flex-wrap items-start gap-x-6 gap-y-3 pt-3">
        <SelectField
          label={`Model for ${option.label}`}
          options={option.modelOptions.map((offer) => ({ value: offer.model, label: offer.label }))}
          value={model}
          errorMessage={modelErrorMessage}
          className="w-60"
          onChange={(chosenModel) => {
            const modelOption = option.modelOptions.find((offer) => offer.model === chosenModel)
            if (modelOption !== undefined) onModelChange(modelOption)
          }}
        />
        {chosenModelOption?.hasEffortChoice === true
          ? (
              <SegmentedChoice
                label={`Effort for ${option.label}`}
                options={chosenModelOption.effortOptions.map((offer) => ({ value: offer.effort, label: offer.label }))}
                value={effort}
                onChange={onEffortChange}
              />
            )
          : null}
      </div>
      {effortErrorMessage === null ? null : <p role="alert" className="text-sm text-destructive">{effortErrorMessage}</p>}
    </>
  )
}

const AgentRow = ({
  option,
  groupName,
  isPicked,
  isDefault,
  installPath,
  model,
  effort,
  pathErrorMessage,
  modelErrorMessage,
  effortErrorMessage,
  onPickedChange,
  onDefaultChange,
  onInstallPathChange,
  onModelChange,
  onEffortChange,
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
              <AgentRunSettings
                option={option}
                model={model}
                effort={effort}
                modelErrorMessage={modelErrorMessage}
                effortErrorMessage={effortErrorMessage}
                onModelChange={onModelChange}
                onEffortChange={onEffortChange}
              />
            </div>
          )
        : null}
    </li>
  )
}

const AgentsForm = ({
  agents,
  defaultAgent,
  problem,
  children,
  folderBrowser,
  folderBrowserErrorMessage,
  onBrowseFolder,
  onBrowseEnd,
  onSubmit,
}: AgentsFormProps) => {
  const defaultGroupId = useId()
  const [pickedByAgent, setPickedByAgent] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(agents.map((option) => [option.agent, option.isPicked])),
  )
  const [pathByAgent, setPathByAgent] = useState<Record<string, string>>(() =>
    Object.fromEntries(agents.map((option) => [option.agent, option.installPath])),
  )
  const [modelByAgent, setModelByAgent] = useState<Record<string, string>>(() =>
    Object.fromEntries(agents.map((option) => [option.agent, option.model])),
  )
  const [effortByAgent, setEffortByAgent] = useState<Record<string, string>>(() =>
    Object.fromEntries(agents.map((option) => [option.agent, option.effort])),
  )
  const [chosenDefault, setChosenDefault] = useState(defaultAgent)
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
        effort: effortByAgent[option.agent] ?? option.effort,
      })),
      defaultAgent: chosenDefault,
    })
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        handleSubmit()
      }}
    >
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
            effort={effortByAgent[option.agent] ?? option.effort}
            pathErrorMessage={
              problem?.field?.owner === option.agent && !SETTING_FIELDS.includes(problem.field.name) ? problem.message : null
            }
            modelErrorMessage={
              problem?.field?.owner === option.agent && problem.field.name === MODEL_FIELD ? problem.message : null
            }
            effortErrorMessage={
              problem?.field?.owner === option.agent && problem.field.name === EFFORT_FIELD ? problem.message : null
            }
            onPickedChange={(isPicked) => { setPickedByAgent((picked) => ({ ...picked, [option.agent]: isPicked })) }}
            onDefaultChange={() => { setChosenDefault(option.agent) }}
            onInstallPathChange={(installPath) => {
              setPathByAgent((paths) => ({ ...paths, [option.agent]: installPath }))
            }}
            onModelChange={(modelOption) => {
              setModelByAgent((models) => ({ ...models, [option.agent]: modelOption.model }))
              setEffortByAgent((efforts) => ({ ...efforts, [option.agent]: modelOption.selectedEffort }))
            }}
            onEffortChange={(chosenEffort) => {
              setEffortByAgent((efforts) => ({ ...efforts, [option.agent]: chosenEffort }))
            }}
            onBrowse={() => { handleBrowse(option) }}
          />
        ))}
      </ul>
      {children}
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

export default AgentsForm
