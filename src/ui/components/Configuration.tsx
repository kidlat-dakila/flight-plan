import { useEffect, useRef, useState } from "react"
import { VscodeButton, VscodeDivider, VscodeIcon } from "../vscode"
import type { ConfigField, ConfigItem } from "../../lib/schemas/configView"
import type { ConfigMessage } from "../setup/protocol"
import type { Config } from "../../utils/setup/state"

/**
 * The configuration screen, in place of the old How to use guide.
 *
 * A profile switcher and a list of every editable configuration, grouped by
 * schema section; clicking a row opens a modal to edit it. The default profile
 * is read-only, so editing is enabled only once the reader creates one of their
 * own. Every edit autosaves — the extension owns the write and re-sends state.
 */

type Props = {
  config: Config
  onConfig: (message: ConfigMessage) => void
}

/** Autosave: post the change after a short pause, so a keystroke is not a write. */
function useAutosave(onConfig: Props["onConfig"]) {
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  useEffect(() => {
    const map = timers.current
    return () => {
      for (const timer of map.values()) clearTimeout(timer)
    }
  }, [])
  return (path: string, content: string) => {
    const existing = timers.current.get(path)
    if (existing !== undefined) clearTimeout(existing)
    timers.current.set(
      path,
      setTimeout(() => {
        onConfig({ type: "config", op: "save", path, content })
        timers.current.delete(path)
      }, 400),
    )
  }
}

function ProfileBar({ config, onConfig }: Props) {
  const [name, setName] = useState("")
  return (
    <div className="profile-bar">
      <label htmlFor="profile">Profile</label>
      <select
        id="profile"
        value={config.active}
        onChange={(event) => {
          onConfig({ type: "config", op: "switch", profile: event.target.value })
        }}
      >
        {config.profiles.map((profile) => (
          <option key={profile} value={profile}>
            {profile}
          </option>
        ))}
      </select>
      <input
        aria-label="New profile name"
        className="profile-new"
        placeholder="new profile name"
        value={name}
        onChange={(event) => {
          setName(event.target.value)
        }}
      />
      <VscodeButton
        secondary
        onClick={() => {
          const trimmed = name.trim()
          if (trimmed === "") return
          onConfig({ type: "config", op: "create", name: trimmed })
          setName("")
        }}
      >
        Create (copies default)
      </VscodeButton>
    </div>
  )
}

/** The edit modal for one item. A body carries its on/off; a field its prose. */
function Modal({
  item,
  editable,
  onConfig,
  onClose,
}: {
  item: ConfigItem
  editable: boolean
  onConfig: Props["onConfig"]
  onClose: () => void
}) {
  const save = useAutosave(onConfig)
  return (
    <div className="modal-scrim">
      {/* A backdrop button so click-outside closes the modal, keyboard-accessible. */}
      <button type="button" className="modal-backdrop" aria-label="Close" onClick={onClose} />
      <div className="modal-card" role="dialog" aria-label={item.title}>
        <header>
          <h2>{item.title}</h2>
          <VscodeButton secondary onClick={onClose}>
            <VscodeIcon name="close" />
          </VscodeButton>
        </header>
        <p className="detail">{item.description}</p>
        {!editable && (
          <p className="detail warn">
            <VscodeIcon name="warning" />
            The default profile is read-only. Create a profile to edit it.
          </p>
        )}
        {item.kind === "body" ? (
          <label className="toggle">
            <input
              type="checkbox"
              checked={item.on}
              disabled={!editable}
              onChange={(event) => {
                onConfig({ type: "config", op: "toggle", body: item.body, on: event.target.checked })
              }}
            />
            Generate this section for every document
          </label>
        ) : (
          <FieldEditor field={item} editable={editable} save={save} />
        )}
      </div>
    </div>
  )
}

function FieldEditor({
  field,
  editable,
  save,
}: {
  field: ConfigField
  editable: boolean
  save: (path: string, content: string) => void
}) {
  return (
    <>
      {/* What the field is — shipped, read-only context for the instruction below. */}
      <p className="field-description">{field.fieldDescription}</p>
      <label className="editor-label" htmlFor="instruction">
        How to write it
      </label>
      <textarea
        id="instruction"
        className="instruction"
        defaultValue={field.instruction}
        readOnly={!editable}
        onChange={(event) => {
          save(field.writePath, event.target.value)
        }}
      />
      {field.values && field.values.length > 0 && (
        <div className="values">
          <span className="editor-label">Options</span>
          {/* Each option's meaning is its own instruction file, saved on its own path. */}
          {field.values.map((value) => (
            <div key={value.option} className="value">
              <label className="value-option" htmlFor={`option-${value.option}`}>
                {value.option}
              </label>
              <textarea
                id={`option-${value.option}`}
                defaultValue={value.instruction}
                readOnly={!editable}
                onChange={(event) => {
                  save(value.writePath, event.target.value)
                }}
              />
            </div>
          ))}
        </div>
      )}
    </>
  )
}

export function Configuration({ config, onConfig }: Props) {
  const [open, setOpen] = useState<ConfigItem | null>(null)
  return (
    <div className="configuration">
      <ProfileBar config={config} onConfig={onConfig} />
      {config.groups.map((group) => (
        <section key={group.section}>
          <VscodeDivider />
          <h2>{group.title}</h2>
          <ul className="config-list">
            {group.items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="config-row"
                  onClick={() => {
                    setOpen(item)
                  }}
                >
                  <span className="config-title">{item.title}</span>
                  {item.kind === "body" && (
                    <span className={`badge ${item.on ? "on" : "off"}`}>
                      {item.on ? "on" : "off"}
                    </span>
                  )}
                  <span className="config-desc">{item.description}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {open !== null && (
        <Modal
          item={open}
          editable={config.editable}
          onConfig={onConfig}
          onClose={() => {
            setOpen(null)
          }}
        />
      )}
    </div>
  )
}
