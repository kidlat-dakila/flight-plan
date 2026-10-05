import { useId, useState } from "react"
import Button from "@flightplan/ui/blocks/button"
import { cn } from "@flightplan/ui/lib/utils"
import SegmentedChoice from "@flightplan/ui/SegmentedChoice"
import SelectDialog from "@flightplan/ui/SelectDialog"
import SelectField from "@flightplan/ui/SelectField"
import TerminusHeading from "@/routes/pr-reviews/$repoName/-components/TerminusHeading"

type PresetName = "standard" | "minimal" | "onboardee" | "unfamiliar-territory"

type WalkthroughOrder = "foundations-first" | "along-the-path" | "core-change-first" | "risk-first" | "custom"

type AgentName = "claude" | "codex" | "cursor"

type WriterKey = AgentName | "manual"

interface ConfigurationOption {
  readonly preset: PresetName
  readonly label: string
  readonly tagLabel: string | null
  readonly bestFor: string
  readonly description: string
  readonly note: string | null
}

interface OrderOption {
  readonly order: WalkthroughOrder
  readonly label: string
  readonly tagLabel: string | null
  readonly summary: string
  readonly description: string
  readonly promptField: { readonly label: string, readonly placeholder: string } | null
}

interface AgentOption {
  readonly agent: AgentName
  readonly label: string
  readonly description: string
  readonly unavailableReason: string | null
  readonly modelChoice: {
    readonly legend: string
    readonly options: readonly { readonly model: string, readonly label: string }[]
  } | null
  readonly selectedModel: string
  readonly effortChoice: {
    readonly legend: string
    readonly options: readonly { readonly effort: string, readonly label: string }[]
  } | null
  readonly selectedEffort: string
  readonly hasSettings: boolean
  readonly submitLabel: string
}

interface StartForm {
  readonly configuration: {
    readonly heading: string
    readonly hint: string
    readonly dialogTitle: string
    readonly dialogDescription: string
    readonly chooseLabel: string
    readonly cancelLabel: string
    readonly selectedPreset: PresetName
    readonly options: readonly ConfigurationOption[]
  }
  readonly order: {
    readonly heading: string
    readonly hint: string
    readonly dialogTitle: string
    readonly dialogDescription: string
    readonly chooseLabel: string
    readonly cancelLabel: string
    readonly selectedOrder: WalkthroughOrder
    readonly options: readonly OrderOption[]
  }
  readonly writer: {
    readonly heading: string
    readonly hint: string
    readonly selectedKey: WriterKey
    readonly agents: readonly AgentOption[]
    readonly manual: { readonly label: string, readonly description: string, readonly submitLabel: string }
  }
  readonly pendingLabel: string
}

export interface ReviewChoice {
  readonly preset: PresetName
  readonly order: WalkthroughOrder
  readonly customOrder: string
  readonly writer:
    | { readonly kind: "agent", readonly agent: AgentName, readonly model: string, readonly effort: string }
    | { readonly kind: "manual" }
}

export interface RequestProblem {
  readonly field: "customOrder" | "writer" | "model" | "effort"
  readonly message: string
}

interface StartReviewProps {
  readonly heading: string
  readonly message: string
  readonly form: StartForm
  readonly problem: RequestProblem | null
  readonly errorMessage: string | null
  readonly isPending: boolean
  readonly dataNotice: string | null
  readonly onSubmit: (choice: ReviewChoice) => void
}

interface AgentRowProps {
  readonly option: AgentOption
  readonly groupName: string
  readonly isChosen: boolean
  readonly model: string
  readonly effort: string
  readonly onChoose: () => void
  readonly onModelChange: (model: string) => void
  readonly onEffortChange: (effort: string) => void
}

const MANUAL_WRITER = "manual"
const SECTION_CLASSES = "border-t border-border pt-6 pb-5"
const HEADING_CLASSES = "text-xl leading-7 font-bold text-(--line)"
const HINT_CLASSES = "max-w-[62ch] pb-3 text-sm text-muted-foreground"
const ROW_CLASSES = "border-b border-border py-3 last:border-b-0"
const CHOICE_INPUT_CLASSES = "size-4 shrink-0 accent-(--primary)"
const CHOICE_LABEL_CLASSES = "grid cursor-pointer grid-cols-[1rem_minmax(0,1fr)] gap-x-3"
const CHOICE_RADIO_CLASSES = `${CHOICE_INPUT_CLASSES} row-span-2 mt-1`
const DESCRIPTION_CLASSES = "col-start-2 max-w-[62ch] text-sm text-muted-foreground"
const TEXTAREA_CLASSES = "min-h-20 w-full max-w-xl resize-y rounded-lg border border-input bg-card px-2.5 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20"

const AgentRow = ({
  option,
  groupName,
  isChosen,
  model,
  effort,
  onChoose,
  onModelChange,
  onEffortChange,
}: AgentRowProps) => {
  const isAvailable = option.unavailableReason === null
  return (
    <li className={ROW_CLASSES}>
      <label className={cn(CHOICE_LABEL_CLASSES, isAvailable ? "" : "cursor-default")}>
        <input
          type="radio"
          name={groupName}
          checked={isChosen}
          disabled={!isAvailable}
          className={CHOICE_RADIO_CLASSES}
          onChange={onChoose}
        />
        <span className="font-bold">{option.label}</span>
        {option.unavailableReason === null
          ? <span className={DESCRIPTION_CLASSES}>{option.description}</span>
          : (
              <span className={DESCRIPTION_CLASSES}>
                <span className="font-bold text-foreground">Unavailable.</span>
                {` ${option.unavailableReason}`}
              </span>
            )}
      </label>
      {isChosen && option.hasSettings
        ? (
            <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-3 pl-7">
              {option.modelChoice === null
                ? null
                : (
                    <SelectField
                      label={option.modelChoice.legend}
                      options={option.modelChoice.options.map((offer) => ({ value: offer.model, label: offer.label }))}
                      value={model}
                      className="w-60"
                      onChange={onModelChange}
                    />
                  )}
              {option.effortChoice === null
                ? null
                : (
                    <SegmentedChoice
                      label={option.effortChoice.legend}
                      options={option.effortChoice.options.map((offer) => ({ value: offer.effort, label: offer.label }))}
                      value={effort}
                      onChange={onEffortChange}
                    />
                  )}
            </div>
          )
        : null}
    </li>
  )
}

const StartReview = ({
  heading,
  message,
  form,
  problem,
  errorMessage,
  isPending,
  dataNotice,
  onSubmit,
}: StartReviewProps) => {
  const configurationHeadingId = useId()
  const configurationHintId = useId()
  const orderHeadingId = useId()
  const orderHintId = useId()
  const customOrderId = useId()
  const customOrderErrorId = useId()
  const writerGroupId = useId()
  const [chosenPreset, setChosenPreset] = useState(form.configuration.selectedPreset)
  const [chosenOrder, setChosenOrder] = useState(form.order.selectedOrder)
  const [customOrder, setCustomOrder] = useState("")
  const [chosenWriterKey, setChosenWriterKey] = useState<WriterKey>(form.writer.selectedKey)
  const [modelByAgent, setModelByAgent] = useState<Record<string, string>>(() =>
    Object.fromEntries(form.writer.agents.map((option) => [option.agent, option.selectedModel])),
  )
  const [effortByAgent, setEffortByAgent] = useState<Record<string, string>>(() =>
    Object.fromEntries(form.writer.agents.map((option) => [option.agent, option.selectedEffort])),
  )
  const chosenAgent = form.writer.agents.find((option) => option.agent === chosenWriterKey)
  const chosenOrderOption = form.order.options.find((option) => option.order === chosenOrder)
  const customOrderProblem = problem?.field === "customOrder" ? problem.message : null
  const writerProblem = problem !== null && problem.field !== "customOrder" ? problem.message : null

  const handleSubmit = () => {
    onSubmit({
      preset: chosenPreset,
      order: chosenOrder,
      customOrder,
      writer: chosenAgent === undefined
        ? { kind: "manual" }
        : {
            kind: "agent",
            agent: chosenAgent.agent,
            model: modelByAgent[chosenAgent.agent] ?? chosenAgent.selectedModel,
            effort: effortByAgent[chosenAgent.agent] ?? chosenAgent.selectedEffort,
          },
    })
  }

  return (
    <div className="max-w-208">
      <TerminusHeading heading={heading} message={message} />
      <form action={handleSubmit} className="pt-6 pl-10">
        <section className={`${SECTION_CLASSES} pb-8`} aria-labelledby={configurationHeadingId}>
          <h3 id={configurationHeadingId} className={HEADING_CLASSES}>{form.configuration.heading}</h3>
          <p id={configurationHintId} className={HINT_CLASSES}>{form.configuration.hint}</p>
          <SelectDialog
            label={form.configuration.heading}
            dialogTitle={form.configuration.dialogTitle}
            dialogDescription={form.configuration.dialogDescription}
            chooseLabel={form.configuration.chooseLabel}
            cancelLabel={form.configuration.cancelLabel}
            options={form.configuration.options.map((option) => ({
              key: option.preset,
              label: option.label,
              tagLabel: option.tagLabel,
              summary: option.bestFor,
              description: option.description,
              note: option.note,
            }))}
            selectedKey={chosenPreset}
            describedBy={configurationHintId}
            onChoose={(key) => {
              const chosen = form.configuration.options.find((option) => option.preset === key)
              if (chosen !== undefined) setChosenPreset(chosen.preset)
            }}
          />
        </section>
        <section className={`${SECTION_CLASSES} pb-8`} aria-labelledby={orderHeadingId}>
          <h3 id={orderHeadingId} className={HEADING_CLASSES}>{form.order.heading}</h3>
          <p id={orderHintId} className={HINT_CLASSES}>{form.order.hint}</p>
          <SelectDialog
            label={form.order.heading}
            dialogTitle={form.order.dialogTitle}
            dialogDescription={form.order.dialogDescription}
            chooseLabel={form.order.chooseLabel}
            cancelLabel={form.order.cancelLabel}
            options={form.order.options.map((option) => ({
              key: option.order,
              label: option.label,
              tagLabel: option.tagLabel,
              summary: option.summary,
              description: option.description,
              note: null,
            }))}
            selectedKey={chosenOrder}
            describedBy={orderHintId}
            onChoose={(key) => {
              const chosen = form.order.options.find((option) => option.order === key)
              if (chosen !== undefined) setChosenOrder(chosen.order)
            }}
          />
          {chosenOrderOption?.promptField == null
            ? null
            : (
                <div className="mt-4 grid max-w-xl gap-1.5">
                  <label htmlFor={customOrderId} className="text-sm font-bold">{chosenOrderOption.promptField.label}</label>
                  <textarea
                    id={customOrderId}
                    value={customOrder}
                    placeholder={chosenOrderOption.promptField.placeholder}
                    aria-invalid={customOrderProblem !== null}
                    aria-describedby={customOrderProblem === null ? undefined : customOrderErrorId}
                    className={TEXTAREA_CLASSES}
                    onChange={(event) => { setCustomOrder(event.target.value) }}
                  />
                  {customOrderProblem === null
                    ? null
                    : <p id={customOrderErrorId} role="alert" className="text-sm text-destructive">{customOrderProblem}</p>}
                </div>
              )}
        </section>
        <fieldset className={SECTION_CLASSES}>
          <legend className={`${HEADING_CLASSES} float-left w-full`}>{form.writer.heading}</legend>
          <p className={`${HINT_CLASSES} clear-left`}>{form.writer.hint}</p>
          <ul className="border-t border-border">
            {form.writer.agents.map((option) => (
              <AgentRow
                key={option.agent}
                option={option}
                groupName={writerGroupId}
                isChosen={chosenWriterKey === option.agent}
                model={modelByAgent[option.agent] ?? option.selectedModel}
                onChoose={() => { setChosenWriterKey(option.agent) }}
                effort={effortByAgent[option.agent] ?? option.selectedEffort}
                onModelChange={(model) => { setModelByAgent((models) => ({ ...models, [option.agent]: model })) }}
                onEffortChange={(effort) => { setEffortByAgent((efforts) => ({ ...efforts, [option.agent]: effort })) }}
              />
            ))}
            <li className={ROW_CLASSES}>
              <label className={CHOICE_LABEL_CLASSES}>
                <input
                  type="radio"
                  name={writerGroupId}
                  checked={chosenWriterKey === MANUAL_WRITER}
                  className={CHOICE_RADIO_CLASSES}
                  onChange={() => { setChosenWriterKey(MANUAL_WRITER) }}
                />
                <span className="font-bold">{form.writer.manual.label}</span>
                <span className={DESCRIPTION_CLASSES}>{form.writer.manual.description}</span>
              </label>
            </li>
          </ul>
          {writerProblem === null ? null : <p role="alert" className="pt-3 text-sm text-destructive">{writerProblem}</p>}
        </fieldset>
        <footer className="border-t border-border pt-4">
          {errorMessage === null ? null : <p role="alert" className="pb-3 text-sm text-destructive">{errorMessage}</p>}
          <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
            {dataNotice === null ? null : <p className="flex-1 text-sm text-muted-foreground">{dataNotice}</p>}
            <Button type="submit" disabled={isPending}>
              {isPending ? form.pendingLabel : chosenAgent?.submitLabel ?? form.writer.manual.submitLabel}
            </Button>
          </div>
        </footer>
      </form>
    </div>
  )
}

export default StartReview
