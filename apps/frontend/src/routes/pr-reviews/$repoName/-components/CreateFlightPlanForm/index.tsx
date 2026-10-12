import { useId, useState } from "react"
import Button from "@flightplan/ui/blocks/button"
import StartReviewForm, { type RequestProblem, type ReviewChoice, type StartForm } from "@flightplan/ui/StartReviewForm"
import SuggestionField from "@flightplan/ui/SuggestionField"

type InitializationKind = "draft" | "scaffold" | "empty"

export interface TargetOption {
  readonly id: string
  readonly label: string
  readonly detail: string
  readonly stateLabel: string | null
  readonly isDisabled: boolean
}

interface InitializationOption {
  readonly kind: InitializationKind
  readonly label: string
  readonly description: string
  readonly authorWriting: { readonly start: "scaffold" | "empty", readonly submitLabel: string } | null
}

export interface CreationForm {
  readonly title: string
  readonly description: string
  readonly target: {
    readonly label: string
    readonly hint: string
    readonly placeholder: string
    readonly selected: TargetOption | null
  }
  readonly initialization: {
    readonly legend: string
    readonly selectedKind: InitializationKind
    readonly options: readonly InitializationOption[]
  }
  readonly form: StartForm
  readonly pendingLabel: string
}

export interface TargetSearch {
  readonly value: string
  readonly options: readonly TargetOption[]
  readonly message: string | null
}

interface CreateFlightPlanFormProps {
  readonly creationForm: CreationForm
  readonly targetSearch: TargetSearch
  readonly problem: RequestProblem | null
  readonly errorMessage: string | null
  readonly isPending: boolean
  readonly onTargetQueryChange: (query: string) => void
  readonly onTargetSelect: (targetId: string) => void
  readonly onSubmit: (choice: ReviewChoice) => void
}

const TARGET_FIELD = "target"
const HEADING_CLASSES = "text-xl leading-7 font-semibold tracking-[-0.01em] text-foreground"
const ROW_CLASSES = "border-b border-border py-3 last:border-b-0"
const CHOICE_LABEL_CLASSES = "grid cursor-pointer grid-cols-[1rem_minmax(0,1fr)] gap-x-3"
const CHOICE_RADIO_CLASSES = "row-span-2 mt-1 size-4 shrink-0 accent-(--primary)"
const DESCRIPTION_CLASSES = "col-start-2 max-w-[62ch] text-sm text-muted-foreground"

const CreateFlightPlanForm = ({
  creationForm,
  targetSearch,
  problem,
  errorMessage,
  isPending,
  onTargetQueryChange,
  onTargetSelect,
  onSubmit,
}: CreateFlightPlanFormProps) => {
  const initializationGroupId = useId()
  const [chosenKind, setChosenKind] = useState(creationForm.initialization.selectedKind)
  const authorWriting = creationForm.initialization.options.find((option) => option.kind === chosenKind)?.authorWriting ?? null
  const targetProblem = problem?.field === TARGET_FIELD ? problem.message : null

  const handleAuthorSubmit = () => {
    if (authorWriting === null) return
    onSubmit({
      preset: creationForm.form.configuration.selectedPreset,
      order: creationForm.form.order.selectedOrder,
      customOrder: creationForm.form.order.customOrder,
      writer: { kind: "author", start: authorWriting.start },
    })
  }

  return (
    <div className="grid max-w-208 gap-4">
      <SuggestionField
        label={creationForm.target.label}
        hint={creationForm.target.hint}
        placeholder={creationForm.target.placeholder}
        value={targetSearch.value}
        suggestions={targetSearch.options}
        message={targetSearch.message}
        errorMessage={targetProblem}
        className="max-w-xl"
        onValueChange={onTargetQueryChange}
        onSelect={onTargetSelect}
      />
      <fieldset className="pt-2">
        <legend className={`${HEADING_CLASSES} float-left w-full pb-2`}>{creationForm.initialization.legend}</legend>
        <ul className="clear-left border-t border-border">
          {creationForm.initialization.options.map((option) => (
            <li key={option.kind} className={ROW_CLASSES}>
              <label className={CHOICE_LABEL_CLASSES}>
                <input
                  type="radio"
                  name={initializationGroupId}
                  checked={chosenKind === option.kind}
                  className={CHOICE_RADIO_CLASSES}
                  onChange={() => { setChosenKind(option.kind) }}
                />
                <span className="font-bold">{option.label}</span>
                <span className={DESCRIPTION_CLASSES}>{option.description}</span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>
      {authorWriting === null
        ? (
            <StartReviewForm
              form={creationForm.form}
              problem={targetProblem === null ? problem : null}
              errorMessage={errorMessage}
              isPending={isPending}
              dataNotice={null}
              onSubmit={onSubmit}
            />
          )
        : (
            <form action={handleAuthorSubmit} className="border-t border-border pt-4">
              {errorMessage === null ? null : <p role="alert" className="pb-3 text-sm text-destructive">{errorMessage}</p>}
              <div className="flex justify-end">
                <Button type="submit" disabled={isPending}>
                  {isPending ? creationForm.pendingLabel : authorWriting.submitLabel}
                </Button>
              </div>
            </form>
          )}
    </div>
  )
}

export default CreateFlightPlanForm
