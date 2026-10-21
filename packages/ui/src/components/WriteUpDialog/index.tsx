import { useState } from "react"
import Button from "@/components/blocks/button"
import Dialog, {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/blocks/dialog"
import PromptConfigurationField, { type PromptConfigurationOption } from "@/components/PromptConfigurationField"
import WalkthroughOrderField, { type WalkthroughOrder } from "@/components/WalkthroughOrderField"
import { submitHandlerOf } from "@/lib/form-submit"

export type WriteUpSection = "context" | "traceDiagram" | "blastDiagram" | "walkthrough" | "findings"

export type WriteUpWalkthroughOrder = WalkthroughOrder

export interface WriteUpPlan {
  readonly agentLabel: string
  readonly summary: readonly { readonly label: string, readonly value: string }[]
  readonly sections: readonly {
    readonly section: WriteUpSection
    readonly label: string
    readonly countLabel: string
    readonly isChosen: boolean
  }[]
  readonly totalLabel: string
  readonly configurations: readonly PromptConfigurationOption[]
  readonly configurationId: string
  readonly walkthroughOrder: WriteUpWalkthroughOrder
  readonly isSegmented: boolean
}

export interface WriteUpChoice {
  readonly sections: WriteUpSection[]
  readonly configurationId: string
  readonly walkthroughOrder: WriteUpWalkthroughOrder
  readonly isSegmented: boolean
}

export interface WriteUpProblem {
  readonly field: "sections" | "configuration" | "agent"
  readonly message: string
}

interface WriteUpDialogProps {
  readonly plan: WriteUpPlan
  readonly problem: WriteUpProblem | null
  readonly isPending: boolean
  readonly onSectionsChange: (sections: WriteUpSection[]) => void
  readonly onSubmit: (choice: WriteUpChoice) => void
  readonly onClose: () => void
}

interface ChoiceFieldsProps {
  readonly plan: WriteUpPlan
  readonly problem: WriteUpProblem | null
  readonly configurationId: string
  readonly walkthroughOrder: WriteUpWalkthroughOrder
  readonly isSegmented: boolean
  readonly onSectionsChange: (sections: WriteUpSection[]) => void
  readonly onConfigurationChange: (configurationId: string) => void
  readonly onWalkthroughOrderChange: (order: WriteUpWalkthroughOrder) => void
  readonly onSegmentedChange: (isSegmented: boolean) => void
}

const CONFIGURE_LABEL = "Configure"
const DECLINE_LABEL = "Not now"
const SUBMIT_LABEL = "Write up"
const PENDING_LABEL = "Starting…"
const SECTIONS_LEGEND = "Parts to write up"
const CONFIGURATION_HEADING = "Prompt configuration"
const ORDER_HEADING = "Code Walkthrough order"
const TOTAL_LABEL = "Total"
const SEGMENTS_LABEL = "Split this review into segments"
const LEGEND_CLASSES = "pb-2 font-bold"
const ROW_CLASSES = "border-b border-border py-2.5"
const ALERT_CLASSES = "pt-2 text-destructive"

const titleOf = (agentLabel: string): string => `Ask ${agentLabel} to write up this review?`

const descriptionOf = (agentLabel: string): string =>
  `Flight Plan built this review from the code. ${agentLabel} can write the context, the labels, the explanations and the findings.`

const chosenSectionsOf = (plan: WriteUpPlan): WriteUpSection[] =>
  plan.sections.filter((option) => option.isChosen).map((option) => option.section)

const withSection = (sections: readonly WriteUpSection[], section: WriteUpSection, isChosen: boolean): WriteUpSection[] =>
  isChosen ? [...sections, section] : sections.filter((chosen) => chosen !== section)

const problemAt = (problem: WriteUpProblem | null, field: WriteUpProblem["field"]): string | null =>
  problem?.field === field ? problem.message : null

const Summary = ({ plan }: { readonly plan: WriteUpPlan }) => (
  <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-1.5 border-y border-border py-3">
    {plan.summary.map((entry) => (
      <div key={entry.label} className="contents">
        <dt className="text-muted-foreground">{entry.label}</dt>
        <dd className="font-bold">{entry.value}</dd>
      </div>
    ))}
    <dt className="text-muted-foreground">{TOTAL_LABEL}</dt>
    <dd className="font-bold tabular-nums">{plan.totalLabel}</dd>
  </dl>
)

const Total = ({ plan }: { readonly plan: WriteUpPlan }) => (
  <p className="flex items-baseline justify-between gap-6 pr-1">
    <span className="text-muted-foreground">{TOTAL_LABEL}</span>
    <span className="font-bold tabular-nums">{plan.totalLabel}</span>
  </p>
)

const ChoiceFields = ({
  plan,
  problem,
  configurationId,
  walkthroughOrder,
  isSegmented,
  onSectionsChange,
  onConfigurationChange,
  onWalkthroughOrderChange,
  onSegmentedChange,
}: ChoiceFieldsProps) => {
  const sectionsProblem = problemAt(problem, "sections")
  const configurationProblem = problemAt(problem, "configuration")
  const chosenSections = chosenSectionsOf(plan)
  return (
    <div className="grid max-h-[60dvh] gap-5 overflow-y-auto pr-1">
      <fieldset>
        <legend className={LEGEND_CLASSES}>{SECTIONS_LEGEND}</legend>
        <ul className="border-t border-border">
          {plan.sections.map((option) => (
            <li key={option.section} className={ROW_CLASSES}>
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={option.isChosen}
                  className="size-4 shrink-0 accent-(--primary)"
                  onChange={(event) => { onSectionsChange(withSection(chosenSections, option.section, event.target.checked)) }}
                />
                <span className="flex-1 font-bold">{option.label}</span>
                <span className="text-muted-foreground tabular-nums">{option.countLabel}</span>
              </label>
            </li>
          ))}
        </ul>
        {sectionsProblem === null ? null : <p role="alert" className={ALERT_CLASSES}>{sectionsProblem}</p>}
      </fieldset>
      <div>
        <p className={LEGEND_CLASSES}>{CONFIGURATION_HEADING}</p>
        <PromptConfigurationField options={plan.configurations} value={configurationId} onChange={onConfigurationChange} />
        {configurationProblem === null ? null : <p role="alert" className={ALERT_CLASSES}>{configurationProblem}</p>}
      </div>
      <div>
        <p className={LEGEND_CLASSES}>{ORDER_HEADING}</p>
        <WalkthroughOrderField value={walkthroughOrder} onChange={onWalkthroughOrderChange} />
      </div>
      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={isSegmented}
          className="size-4 shrink-0 accent-(--primary)"
          onChange={(event) => { onSegmentedChange(event.target.checked) }}
        />
        <span className="font-bold">{SEGMENTS_LABEL}</span>
      </label>
    </div>
  )
}

const WriteUpDialog = ({ plan, problem, isPending, onSectionsChange, onSubmit, onClose }: WriteUpDialogProps) => {
  const [isConfiguring, setIsConfiguring] = useState(false)
  const [configurationId, setConfigurationId] = useState(plan.configurationId)
  const [walkthroughOrder, setWalkthroughOrder] = useState(plan.walkthroughOrder)
  const [isSegmented, setIsSegmented] = useState(plan.isSegmented)
  const agentProblem = problemAt(problem, "agent")
  const isShowingFields = isConfiguring || (problem !== null && problem.field !== "agent")
  return (
    <Dialog open onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{titleOf(plan.agentLabel)}</DialogTitle>
          <DialogDescription>{descriptionOf(plan.agentLabel)}</DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={submitHandlerOf(() => { onSubmit({ sections: chosenSectionsOf(plan), configurationId, walkthroughOrder, isSegmented }) })}
        >
          {isShowingFields
            ? (
                <>
                  <ChoiceFields
                    plan={plan}
                    problem={problem}
                    configurationId={configurationId}
                    walkthroughOrder={walkthroughOrder}
                    isSegmented={isSegmented}
                    onSectionsChange={onSectionsChange}
                    onConfigurationChange={setConfigurationId}
                    onWalkthroughOrderChange={setWalkthroughOrder}
                    onSegmentedChange={setIsSegmented}
                  />
                  <Total plan={plan} />
                </>
              )
            : <Summary plan={plan} />}
          {agentProblem === null ? null : <p role="alert" className="text-destructive">{agentProblem}</p>}
          <DialogFooter className="items-center">
            {isShowingFields
              ? null
              : <Button type="button" variant="link" className="mr-auto px-0" onClick={() => { setIsConfiguring(true) }}>{CONFIGURE_LABEL}</Button>}
            <Button type="button" variant="ghost" onClick={onClose}>{DECLINE_LABEL}</Button>
            <Button type="submit" disabled={isPending}>{isPending ? PENDING_LABEL : SUBMIT_LABEL}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default WriteUpDialog
