import { useEffect, useRef, useState } from "react"
import {
  VscodeBadge,
  VscodeButton,
  VscodeDivider,
  VscodeIcon,
  VscodeTabHeader,
  VscodeTabPanel,
  VscodeTabs,
} from "../vscode"
import { Configuration } from "./Configuration"
import { renderMarkdown as render } from "../markdown"
import type { ConfigMessage } from "../setup/protocol"
import type {
  Action,
  State,
  Step,
  Tab,
} from "../../utils/setup/state"

/**
 * The guided setup view.
 *
 * A status list rather than a wizard: every step reports what was found and
 * offers an action only when there is one, and they can be done in any order.
 * The extension owns all the decisions; this renders what it is told and sends
 * back which button was pressed.
 *
 * Built from VS Code's own components. That is not only a matter of looking
 * right: a hand-rolled button has to be told about hover, focus, disabled and
 * the high-contrast themes, and the version here was told about none of them.
 */

type Props = {
  state: State | null
  onAction: (step: string, action: string) => void
  onConfig: (message: ConfigMessage) => void
}

function Buttons({
  step,
  actions,
  onAction,
}: {
  step: string
  actions: Action[]
  onAction: (step: string, action: string) => void
}) {
  if (actions.length === 0) return null
  return (
    <div className="actions">
      {actions.map((action) => (
        <VscodeButton
          key={action.id}
          // `secondary` is the default here, because most of these are things a
          // reader *may* do. The extension marks the one that is the point.
          secondary={action.primary !== true}
          onClick={() => {
            onAction(step, action.id)
          }}
        >
          {action.label}
        </VscodeButton>
      ))}
    </div>
  )
}

function Path({ caption, path }: { caption?: string; path?: string }) {
  if (path === undefined) return null
  return (
    <>
      {caption === undefined ? null : <p className="detail">{caption}</p>}
      <p className="detail path">{path}</p>
    </>
  )
}

function TabBody({
  step,
  tab,
  onAction,
}: {
  step: string
  tab: Tab
  onAction: (step: string, action: string) => void
}) {
  return (
    <>
      <p className="detail">{tab.detail}</p>
      <Path caption={tab.pathCaption} path={tab.path} />
      {tab.snippet === undefined || tab.snippet === "" ? null : (
        <pre>{tab.snippet}</pre>
      )}
      <Buttons
        step={`${step}:${tab.id}`}
        actions={tab.actions}
        onAction={onAction}
      />
      {/*
        Beneath the buttons, not above them. Somebody who already has a token is
        here to press one button; somebody who does not needs the guide, and
        scrolls. Putting a page of prose between the reader and the action would
        serve the second at the first's expense.
      */}
      {tab.guide === undefined || tab.guide === "" ? null : (
        <Guide markdown={tab.guide} />
      )}
    </>
  )
}

/**
 * One agent per tab.
 *
 * `selectedIndex` is component state, not a prop straight from the extension.
 * It has to survive a re-render, because every action re-sends the whole state:
 * without this, copying a snippet on the Cursor tab would bounce the reader
 * back to whichever tab the extension guessed. The extension's `activeTab` is
 * the initial value only.
 *
 * `vscode-tabs` keeps its own selection internally and reports changes on a
 * custom event, which React cannot bind through a plain `on*` prop — hence the
 * wrapper package, which registers the listener for us.
 */
function Tabs({
  step,
  tabs,
  activeTab,
  onAction,
}: {
  step: string
  tabs: Tab[]
  activeTab?: string
  onAction: (step: string, action: string) => void
}) {
  const suggested = tabs.findIndex((tab) => tab.id === activeTab)
  const [selected, setSelected] = useState(suggested < 0 ? 0 : suggested)

  return (
    <VscodeTabs
      className="agents"
      panel
      selectedIndex={selected}
      onVscTabsSelect={(event) => {
        setSelected(event.detail.selectedIndex)
      }}
    >
      {tabs.flatMap((tab) => [
        <VscodeTabHeader key={`${tab.id}-header`} slot="header">
          {tab.label}
          {/* The variant made for this position; the class carries the one
              colour worth adding, since `ready` is the state that means the
              reader can stop looking at this tab. */}
          <VscodeBadge
            variant="tab-header-counter"
            className={tab.badge === "ready" ? "ready" : undefined}
          >
            {tab.badge}
          </VscodeBadge>
        </VscodeTabHeader>,
        <VscodeTabPanel key={`${tab.id}-panel`}>
          <TabBody step={step} tab={tab} onAction={onAction} />
        </VscodeTabPanel>,
      ])}
    </VscodeTabs>
  )
}

/** The circle in the margin: a tick when the step is done, its number if not. */
function StepMarker({ status, position }: { status: Step["status"]; position: number }) {
  return (
    <span className="marker" data-status={status} aria-hidden="true">
      {status === "done" ? <VscodeIcon name="check" size={16} /> : position}
    </span>
  )
}

function StepItem({
  step,
  position,
  onAction,
}: {
  step: Step
  position: number
  onAction: (step: string, action: string) => void
}) {
  return (
    <li data-status={step.status}>
      <VscodeDivider />
      <StepMarker status={step.status} position={position} />
      <h2>{step.title}</h2>
      <p className="detail">{step.detail}</p>
      <Path caption={step.pathCaption} path={step.path} />
      {step.warning === undefined ? null : (
        <p className="detail warn">
          <VscodeIcon name="warning" />
          {step.warning}
        </p>
      )}
      {step.snippet === undefined ? null : <pre>{step.snippet}</pre>}
      <Buttons step={step.id} actions={step.actions} onAction={onAction} />
      {step.tabs === undefined ? null : (
        <Tabs
          step={step.id}
          tabs={step.tabs}
          activeTab={step.activeTab}
          onAction={onAction}
        />
      )}
    </li>
  )
}

/**
 * The How to use guide.
 *
 * Rendered from Markdown the extension ships, with the same engine the
 * walkthrough panel uses. Written imperatively into a ref rather than through
 * `dangerouslySetInnerHTML`, so there is one place in this file that touches
 * HTML and it is obvious which one.
 */
function Guide({ markdown }: { markdown: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = ref.current
    if (element === null) return
    element.innerHTML = render(markdown)
  }, [markdown])

  return <div className="guide fp-markdown" ref={ref} />
}

/**
 * The setup view, in two tabs.
 *
 * Setup is what somebody is blocked on, so it opens first. The guide is beside
 * it rather than in a separate command, because the moment a reader has
 * finished setting up is the moment they want to know what any of it does — and
 * a guide behind a command they have to know about is a guide nobody reads.
 */
export function Setup({ state, onAction, onConfig }: Props) {
  return (
    <main>
      <h1>Thank you for using Flight Plan</h1>
      <p className="lede">
        {state === null ? "Checking what is already set up…" : state.lede}
      </p>
      <VscodeTabs panel>
        <VscodeTabHeader slot="header">Setup</VscodeTabHeader>
        <VscodeTabPanel>
          <ol className="steps">
            {(state?.steps ?? []).map((step, index) => (
              // Keyed by id: a step keeps its identity across re-renders, so
              // the tab a reader has open is not thrown away when the list
              // updates.
              <StepItem
                key={step.id}
                step={step}
                position={index + 1}
                onAction={onAction}
              />
            ))}
          </ol>
          {state === null ? null : (
            <footer>
              <VscodeDivider />
              <p className={state.complete ? "done-all" : undefined}>
                {state.complete ? <VscodeIcon name="pass-filled" /> : null}
                {state.footer}
              </p>
            </footer>
          )}
        </VscodeTabPanel>

        <VscodeTabHeader slot="header">Configuration</VscodeTabHeader>
        <VscodeTabPanel>
          {state === null ? null : (
            <Configuration config={state.config} onConfig={onConfig} />
          )}
        </VscodeTabPanel>
      </VscodeTabs>
    </main>
  )
}
