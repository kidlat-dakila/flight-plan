import { useBlocker } from "@tanstack/react-router"
import { useState, type ReactNode } from "react"
import Button from "@flightplan/ui/blocks/button"
import { submitHandlerOf } from "@flightplan/ui/lib/form-submit"
import TextEditor from "@flightplan/ui/TextEditor"

interface InstructionText {
  readonly key: string
  readonly label: string
  readonly value: string
  readonly shippedValue: string
  readonly shippedLabel: string
  readonly isChanged: boolean
}

interface WrittenText {
  readonly key: string
  readonly text: string
}

interface FieldEditorProps {
  readonly title: string
  readonly summary: string
  readonly path: string
  readonly offMessage: string | null
  readonly texts: readonly InstructionText[]
  readonly renderActions: (unsavedLabel: string | null, leaveQuestion: ReactNode) => ReactNode
  readonly onSubmit: (texts: WrittenText[]) => void
}

const FOLD_SUMMARY_CLASSES = "cursor-pointer text-sm text-muted-foreground underline decoration-input underline-offset-[0.3em] hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
const FOLDED_TEXT_CLASSES = "mt-2 max-w-[75ch] border-l border-input pl-4 text-sm leading-6 whitespace-pre-wrap text-muted-foreground"

const UNSAVED_QUESTION = "You have not saved this field. Leave it and lose what you wrote?"
const UNSAVED_LABEL = "Not saved yet"
const KEEP_EDITING_LABEL = "Keep editing"
const LEAVE_LABEL = "Leave"

const draftsOf = (texts: readonly InstructionText[]): Readonly<Record<string, string>> =>
  Object.fromEntries(texts.map((text) => [text.key, text.value]))

const FieldEditor = ({ title, summary, path, offMessage, texts, renderActions, onSubmit }: FieldEditorProps) => {
  const [drafts, setDrafts] = useState(() => draftsOf(texts))
  const hasUnsavedText = texts.some((text) => drafts[text.key] !== text.value)
  const blocker = useBlocker({ shouldBlockFn: () => hasUnsavedText, enableBeforeUnload: hasUnsavedText, withResolver: true })
  const leaveQuestion = blocker.status === "blocked"
    ? (
        <div role="alert" className="flex flex-wrap items-center justify-end gap-2 pb-3">
          <p className="text-sm">{UNSAVED_QUESTION}</p>
          <Button type="button" variant="ghost" size="sm" onClick={blocker.reset}>{KEEP_EDITING_LABEL}</Button>
          <Button type="button" variant="destructive" size="sm" onClick={blocker.proceed}>{LEAVE_LABEL}</Button>
        </div>
      )
    : null
  return (
    <form onSubmit={submitHandlerOf(() => { onSubmit(texts.map((text) => ({ key: text.key, text: drafts[text.key] ?? text.value }))) })}>
      <h3 className="text-xl leading-7 font-bold">{title}</h3>
      <p className="mt-1 max-w-[62ch] text-muted-foreground">{summary}</p>
      <p className="mt-1 font-mono text-[0.8125rem] wrap-anywhere text-muted-foreground">{path}</p>
      {offMessage === null ? null : <p className="mt-4 max-w-[62ch] border-y border-border py-2.5 text-sm">{offMessage}</p>}
      {texts.map((text) => (
        <section key={text.key} className="mt-6">
          <h4 className="pb-1.5 text-sm font-bold">{text.label}</h4>
          <TextEditor
            label={`${title}: ${text.label}`}
            value={text.value}
            errorMessage={null}
            onChange={(markdown) => { setDrafts((written) => ({ ...written, [text.key]: markdown })) }}
          />
          {text.isChanged
            ? (
                <details className="mt-2">
                  <summary className={FOLD_SUMMARY_CLASSES}>{text.shippedLabel}</summary>
                  <p className={FOLDED_TEXT_CLASSES}>{text.shippedValue}</p>
                </details>
              )
            : null}
        </section>
      ))}
      {renderActions(hasUnsavedText ? UNSAVED_LABEL : null, leaveQuestion)}
    </form>
  )
}

export default FieldEditor
