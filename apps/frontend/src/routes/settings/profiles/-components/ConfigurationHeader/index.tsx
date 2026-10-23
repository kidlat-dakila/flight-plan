import { Link } from "@tanstack/react-router"
import { useState } from "react"
import Button from "@flightplan/ui/blocks/button"
import Input from "@flightplan/ui/blocks/input"
import { submitHandlerOf } from "@flightplan/ui/lib/form-submit"
import ProblemAlert from "@flightplan/ui/ProblemAlert"

interface ConfigurationHeaderProps {
  readonly name: string
  readonly originLabel: string
  readonly notice: { readonly lead: string, readonly advice: string } | null
  readonly canRename: boolean
  readonly canDelete: boolean
  readonly duplicateLabel: string
  readonly isBusy: boolean
  readonly errorMessage: string | null
  readonly onTroubleshoot: (() => void) | null
  readonly onDuplicate: () => void
  readonly onRename: (name: string) => void
  readonly onDelete: () => void
}

type HeaderTask = "none" | "renaming" | "deleting"

const BACK_LABEL = "All configurations"
const RENAME_LABEL = "Rename"
const NAME_LABEL = "Name"
const SAVE_NAME_LABEL = "Save name"
const CANCEL_LABEL = "Cancel"
const DELETE_LABEL = "Delete"
const KEEP_LABEL = "Keep"
const HEADING_CLASSES = "text-2xl leading-8 font-bold tracking-[-0.015em] text-signal-text"

const ConfigurationHeader = (props: ConfigurationHeaderProps) => {
  const [task, setTask] = useState<HeaderTask>("none")
  const [draftName, setDraftName] = useState(props.name)
  return (
    <header className="pb-6">
      <Link
        to="/settings/profiles"
        className="text-sm text-muted-foreground underline decoration-input underline-offset-[0.3em] hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
      >
        {BACK_LABEL}
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-3">
        {task === "renaming"
          ? (
              <form
                className="flex min-w-0 flex-1 flex-wrap items-center gap-2"
                onSubmit={submitHandlerOf(() => {
                  props.onRename(draftName)
                  setTask("none")
                })}
              >
                <Input
                  value={draftName}
                  aria-label={NAME_LABEL}
                  className="max-w-sm flex-1"
                  onChange={(event) => { setDraftName(event.target.value) }}
                />
                <Button type="submit" size="sm">{SAVE_NAME_LABEL}</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => { setTask("none") }}>{CANCEL_LABEL}</Button>
              </form>
            )
          : (
              <div className="min-w-0 flex-1">
                <h2 className={HEADING_CLASSES}>{props.name}</h2>
                <p className="text-sm text-muted-foreground">{props.originLabel}</p>
              </div>
            )}
        {task === "deleting"
          ? (
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm">{`Delete ${props.name}? This cannot be undone.`}</p>
                <Button type="button" variant="ghost" size="sm" onClick={() => { setTask("none") }}>{KEEP_LABEL}</Button>
                <Button type="button" variant="destructive" size="sm" disabled={props.isBusy} onClick={props.onDelete}>{DELETE_LABEL}</Button>
              </div>
            )
          : (
              <div className="flex flex-wrap items-center gap-2">
                {props.canRename && task === "none"
                  ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDraftName(props.name)
                          setTask("renaming")
                        }}
                      >
                        {RENAME_LABEL}
                      </Button>
                    )
                  : null}
                {props.canDelete ? <Button type="button" variant="ghost" size="sm" onClick={() => { setTask("deleting") }}>{DELETE_LABEL}</Button> : null}
                {props.notice === null
                  ? <Button type="button" variant="outline" size="sm" disabled={props.isBusy} onClick={props.onDuplicate}>{props.duplicateLabel}</Button>
                  : null}
              </div>
            )}
      </div>
      {props.errorMessage === null ? null : <ProblemAlert message={props.errorMessage} onTroubleshoot={props.onTroubleshoot} className="pt-3 text-sm text-destructive" />}
      {props.notice === null
        ? null
        : (
            <div role="note" className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-border py-2.5">
              <p className="min-w-0 flex-1 text-sm">
                <strong className="font-bold">{props.notice.lead}</strong>
                {` ${props.notice.advice}`}
              </p>
              <Button type="button" variant="outline" size="sm" disabled={props.isBusy} onClick={props.onDuplicate}>{props.duplicateLabel}</Button>
            </div>
          )}
    </header>
  )
}

export default ConfigurationHeader
