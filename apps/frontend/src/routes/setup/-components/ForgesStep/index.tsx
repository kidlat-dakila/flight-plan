import { useId, useState } from "react"
import Input from "@flightplan/ui/blocks/input"
import { cn } from "@flightplan/ui/lib/utils"
import StepActions, { type StepProblem } from "@/routes/setup/-components/StepActions"
import StepIntro from "@/routes/setup/-components/StepIntro"

type ForgeName = "git" | "gh" | "glab" | "github" | "gitlab" | "bitbucket"

type ForgeFieldName = "username" | "token" | "baseUrl"

type ForgeAvailability
  = | { readonly kind: "available", readonly statusLabel: string | null }
    | { readonly kind: "unavailable", readonly reason: string }

interface ForgeField {
  readonly name: ForgeFieldName
  readonly label: string
  readonly hint: string
  readonly placeholder: string
  readonly value: string
  readonly isSecret: boolean
}

interface ForgeOption {
  readonly forge: ForgeName
  readonly label: string
  readonly description: string
  readonly isPicked: boolean
  readonly isRequired: boolean
  readonly availability: ForgeAvailability
  readonly fields: readonly ForgeField[]
  readonly limitation: { readonly label: string, readonly items: readonly string[] } | null
}

export interface ForgesChoice {
  readonly forges: {
    readonly forge: ForgeName
    readonly isPicked: boolean
    readonly username: string
    readonly token: string
    readonly baseUrl: string
  }[]
  readonly defaultForge: ForgeName
}

interface ForgesStepProps {
  readonly forges: readonly ForgeOption[]
  readonly defaultForge: ForgeName
  readonly backStep: string | null
  readonly problem: StepProblem | null
  readonly isPending: boolean
  readonly onSubmit: (choice: ForgesChoice) => void
}

interface ForgeFieldInputProps {
  readonly forgeLabel: string
  readonly field: ForgeField
  readonly value: string
  readonly errorMessage: string | null
  readonly onChange: (value: string) => void
}

interface ForgeRowProps {
  readonly option: ForgeOption
  readonly groupName: string
  readonly isPicked: boolean
  readonly isDefault: boolean
  readonly valueByField: Readonly<Record<string, string>>
  readonly problem: StepProblem | null
  readonly onPickedChange: (isPicked: boolean) => void
  readonly onDefaultChange: () => void
  readonly onFieldChange: (field: ForgeFieldName, value: string) => void
}

const TITLE = "Connect your git forge"
const CHOICE_INPUT_CLASSES = "size-4 shrink-0 accent-(--primary)"

const LOCAL_FORGE: ForgeName = "git"

const nextDefaultOf = (current: ForgeName, changedForge: ForgeName, isPicked: boolean): ForgeName => {
  if (isPicked) return changedForge
  return current === changedForge ? LOCAL_FORGE : current
}

const fieldKey = (forge: ForgeName, field: ForgeFieldName): string => `${forge}:${field}`

const describedBy = (ids: readonly (string | null)[]): string | undefined => {
  const presentIds = ids.flatMap((id) => (id === null ? [] : [id]))
  return presentIds.length === 0 ? undefined : presentIds.join(" ")
}

const ForgeFieldInput = ({ forgeLabel, field, value, errorMessage, onChange }: ForgeFieldInputProps) => {
  const inputId = useId()
  const hintId = useId()
  const errorId = useId()
  const hasError = errorMessage !== null
  return (
    <div className="grid content-start gap-1.5">
      <label htmlFor={inputId} className="text-sm font-bold">{field.label}</label>
      {field.hint === "" ? null : <p id={hintId} className="text-sm text-muted-foreground">{field.hint}</p>}
      <Input
        id={inputId}
        type={field.isSecret ? "password" : "text"}
        value={value}
        placeholder={field.placeholder}
        autoComplete="off"
        spellCheck={false}
        aria-label={`${field.label} for ${forgeLabel}`}
        aria-invalid={hasError}
        aria-describedby={describedBy([field.hint === "" ? null : hintId, hasError ? errorId : null])}
        className="font-mono placeholder:font-sans"
        onChange={(event) => { onChange(event.target.value) }}
      />
      {hasError ? <p id={errorId} role="alert" className="text-sm text-destructive">{errorMessage}</p> : null}
    </div>
  )
}

const ForgeRow = ({
  option,
  groupName,
  isPicked,
  isDefault,
  valueByField,
  problem,
  onPickedChange,
  onDefaultChange,
  onFieldChange,
}: ForgeRowProps) => {
  const isAvailable = option.availability.kind === "available"
  const isLocked = !isAvailable || option.isRequired
  return (
    <li className="border-b border-border py-3 last:border-b-0">
      <div className="flex items-start gap-4">
        <label className={cn("flex min-w-0 flex-1 items-start gap-3", isLocked ? "" : "cursor-pointer")}>
          <input
            type="checkbox"
            checked={isPicked}
            disabled={isLocked}
            className={`${CHOICE_INPUT_CLASSES} mt-1`}
            onChange={(event) => { onPickedChange(event.target.checked) }}
          />
          <span className="min-w-0">
            <span className="font-bold">{option.label}</span>
            {option.availability.kind === "available" && option.availability.statusLabel !== null
              ? <span className="ml-2 text-sm text-muted-foreground">{option.availability.statusLabel}</span>
              : null}
            <span className="block max-w-[62ch] text-sm text-muted-foreground">{option.description}</span>
            {option.availability.kind === "unavailable"
              ? (
                  <span className="block max-w-[62ch] text-sm text-destructive">
                    <span className="font-bold">Unavailable.</span>
                    {` ${option.availability.reason}`}
                  </span>
                )
              : null}
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
          <span aria-hidden="true">Default</span>
          <span className="sr-only">{`Default forge: ${option.label}`}</span>
        </label>
      </div>
      {isPicked && option.fields.length > 0
        ? (
            <div className="mt-3 grid max-w-xl gap-4 pl-7">
              {option.fields.map((field) => (
                <ForgeFieldInput
                  key={field.name}
                  forgeLabel={option.label}
                  field={field}
                  value={valueByField[fieldKey(option.forge, field.name)] ?? ""}
                  errorMessage={
                    problem?.field?.owner === option.forge && problem.field.name === field.name ? problem.message : null
                  }
                  onChange={(value) => { onFieldChange(field.name, value) }}
                />
              ))}
            </div>
          )
        : null}
      {isPicked && option.limitation !== null
        ? (
            <div className="mt-2 pl-7 text-sm">
              <p>{option.limitation.label}</p>
              <ul className="list-disc pl-5 text-muted-foreground">
                {option.limitation.items.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          )
        : null}
    </li>
  )
}

const ForgesStep = ({ forges, defaultForge, backStep, problem, isPending, onSubmit }: ForgesStepProps) => {
  const defaultGroupId = useId()
  const [pickedByForge, setPickedByForge] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(forges.map((option) => [option.forge, option.isPicked])),
  )
  const [valueByField, setValueByField] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      forges.flatMap((option) => option.fields.map((field) => [fieldKey(option.forge, field.name), field.value])),
    ),
  )
  const [chosenDefault, setChosenDefault] = useState(defaultForge)

  const handleSubmit = () => {
    onSubmit({
      forges: forges.map((option) => ({
        forge: option.forge,
        isPicked: pickedByForge[option.forge] ?? false,
        username: valueByField[fieldKey(option.forge, "username")] ?? "",
        token: valueByField[fieldKey(option.forge, "token")] ?? "",
        baseUrl: valueByField[fieldKey(option.forge, "baseUrl")] ?? "",
      })),
      defaultForge: chosenDefault,
    })
  }

  return (
    <form action={handleSubmit}>
      <StepIntro title={TITLE}>
        A forge hosts your pull requests. Pick every way Flight Plan may reach one, and choose the default. Local git
        works without a forge, with fewer features.
      </StepIntro>
      <ul className="border-t border-border">
        {forges.map((option) => (
          <ForgeRow
            key={option.forge}
            option={option}
            groupName={defaultGroupId}
            isPicked={pickedByForge[option.forge] ?? false}
            isDefault={chosenDefault === option.forge}
            valueByField={valueByField}
            problem={problem}
            onPickedChange={(isPicked) => {
              setPickedByForge((picked) => ({ ...picked, [option.forge]: isPicked }))
              setChosenDefault((current) => nextDefaultOf(current, option.forge, isPicked))
            }}
            onDefaultChange={() => { setChosenDefault(option.forge) }}
            onFieldChange={(field, value) => {
              setValueByField((values) => ({ ...values, [fieldKey(option.forge, field)]: value }))
            }}
          />
        ))}
      </ul>
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

export default ForgesStep
