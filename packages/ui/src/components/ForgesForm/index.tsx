import { useId, useState, type ReactNode } from "react"
import Input from "@/components/blocks/input"
import type { FormProblem } from "@/lib/form-problem"
import { cn } from "@/lib/utils"

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
  readonly availability: ForgeAvailability
  readonly fields: readonly ForgeField[]
}

interface CodeHostFeatures {
  readonly label: string
  readonly items: readonly string[]
}

export interface ForgesChoice {
  readonly forges: {
    readonly forge: ForgeName
    readonly isPicked: boolean
    readonly username: string
    readonly token: string
    readonly baseUrl: string
  }[]
}

interface ForgesFormProps {
  readonly codeHostFeatures: CodeHostFeatures
  readonly hasCodeHost: boolean
  readonly forges: readonly ForgeOption[]
  readonly problem: FormProblem | null
  readonly children: ReactNode
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
  readonly isPicked: boolean
  readonly valueByField: Readonly<Record<string, string>>
  readonly problem: FormProblem | null
  readonly onPickedChange: (isPicked: boolean) => void
  readonly onFieldChange: (field: ForgeFieldName, value: string) => void
}

interface CodeHostQuestionProps {
  readonly isCodeHostWanted: boolean
  readonly onChange: (isCodeHostWanted: boolean) => void
}

const CHOICE_INPUT_CLASSES = "size-4 shrink-0 accent-(--primary)"
const CODE_HOST_QUESTION = "Do you want to connect a code host?"
const LOCAL_GIT_ONLY_LABEL = "No, local git only"
const CODE_HOST_LABEL = "Yes"

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

const ForgeRow = ({ option, isPicked, valueByField, problem, onPickedChange, onFieldChange }: ForgeRowProps) => {
  const isAvailable = option.availability.kind === "available"
  return (
    <li className="border-b border-border py-3 last:border-b-0">
      <label className={cn("flex min-w-0 items-start gap-3", isAvailable ? "cursor-pointer" : "")}>
        <input
          type="checkbox"
          checked={isPicked}
          disabled={!isAvailable}
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
    </li>
  )
}

const CodeHostQuestion = ({ isCodeHostWanted, onChange }: CodeHostQuestionProps) => {
  const radioGroupId = useId()
  return (
    <fieldset className="border-t border-border py-4">
      <legend className="float-left w-full pb-2 font-bold">{CODE_HOST_QUESTION}</legend>
      <div className="clear-left flex flex-wrap gap-x-6 gap-y-2">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="radio"
            name={radioGroupId}
            checked={!isCodeHostWanted}
            className={CHOICE_INPUT_CLASSES}
            onChange={() => { onChange(false) }}
          />
          {LOCAL_GIT_ONLY_LABEL}
        </label>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="radio"
            name={radioGroupId}
            checked={isCodeHostWanted}
            className={CHOICE_INPUT_CLASSES}
            onChange={() => { onChange(true) }}
          />
          {CODE_HOST_LABEL}
        </label>
      </div>
    </fieldset>
  )
}

const ForgesForm = ({ codeHostFeatures, hasCodeHost, forges, problem, children, onSubmit }: ForgesFormProps) => {
  const [isCodeHostWanted, setIsCodeHostWanted] = useState(hasCodeHost)
  const [pickedByForge, setPickedByForge] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(forges.map((option) => [option.forge, option.isPicked])),
  )
  const [valueByField, setValueByField] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      forges.flatMap((option) => option.fields.map((field) => [fieldKey(option.forge, field.name), field.value])),
    ),
  )

  const handleSubmit = () => {
    onSubmit({
      forges: forges.map((option) => ({
        forge: option.forge,
        isPicked: isCodeHostWanted && (pickedByForge[option.forge] ?? false),
        username: valueByField[fieldKey(option.forge, "username")] ?? "",
        token: valueByField[fieldKey(option.forge, "token")] ?? "",
        baseUrl: valueByField[fieldKey(option.forge, "baseUrl")] ?? "",
      })),
    })
  }

  return (
    <form action={handleSubmit}>
      <div className="max-w-[62ch] pb-4 text-sm">
        <p>{codeHostFeatures.label}</p>
        <ul className="list-disc pl-5 text-muted-foreground">
          {codeHostFeatures.items.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </div>
      <CodeHostQuestion isCodeHostWanted={isCodeHostWanted} onChange={setIsCodeHostWanted} />
      {isCodeHostWanted
        ? (
            <ul aria-label="Code hosts" className="border-t border-border">
              {forges.map((option) => (
                <ForgeRow
                  key={option.forge}
                  option={option}
                  isPicked={pickedByForge[option.forge] ?? false}
                  valueByField={valueByField}
                  problem={problem}
                  onPickedChange={(isPicked) => {
                    setPickedByForge((picked) => ({ ...picked, [option.forge]: isPicked }))
                  }}
                  onFieldChange={(field, value) => {
                    setValueByField((values) => ({ ...values, [fieldKey(option.forge, field)]: value }))
                  }}
                />
              ))}
            </ul>
          )
        : null}
      {children}
    </form>
  )
}

export default ForgesForm
