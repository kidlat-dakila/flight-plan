import { useId, useState } from "react"
import Button from "@/components/blocks/button"
import Dialog, {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/blocks/dialog"
import SelectField from "@/components/SelectField"

export type WriteUpSection = "context" | "traceDiagram" | "blastDiagram" | "walkthrough" | "findings"

export type WriteUpWalkthroughOrder = "imports-bottom-up" | "imports-top-down" | "important-first"

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
  readonly configurations: readonly { readonly id: string, readonly label: string }[]
  readonly configurationId: string
  readonly walkthroughOrders: readonly { readonly order: WriteUpWalkthroughOrder, readonly label: string, readonly description: string }[]
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
const CONFIGURATION_LABEL = "Prompt configuration"
const ORDER_LEGEND = "Code Walkthrough order"
const SEGMENTS_LABEL = "Split this review into segments"
const LEGEND_CLASSES = "pb-2 font-bold"
const ROW_CLASSES = "border-b border-border py-2.5"

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
  </dl>
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
  const orderGroupId = useId()
  const sectionsProblem = problemAt(problem, "sections")
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
        {sectionsProblem === null ? null : <p role="alert" className="pt-2 text-destructive">{sectionsProblem}</p>}
      </fieldset>
      <SelectField
        label={CONFIGURATION_LABEL}
        options={plan.configurations.map((configuration) => ({ value: configuration.id, label: configuration.label }))}
        value={configurationId}
        errorMessage={problemAt(problem, "configuration")}
        onChange={onConfigurationChange}
      />
      <fieldset>
        <legend className={LEGEND_CLASSES}>{ORDER_LEGEND}</legend>
        <ul className="border-t border-border">
          {plan.walkthroughOrders.map((option) => (
            <li key={option.order} className={ROW_CLASSES}>
              <label className="grid cursor-pointer grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3">
                <input
                  type="radio"
                  name={orderGroupId}
                  checked={walkthroughOrder === option.order}
                  className="mt-1 size-4 shrink-0 accent-(--primary)"
                  onChange={() => { onWalkthroughOrderChange(option.order) }}
                />
                <span className="font-bold">{option.label}</span>
                <span className="col-start-2 text-muted-foreground">{option.description}</span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>
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
          action={() => { onSubmit({ sections: chosenSectionsOf(plan), configurationId, walkthroughOrder, isSegmented }) }}
          className="grid gap-4"
        >
          {isShowingFields
            ? (
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
              )
            : <Summary plan={plan} />}
          <p className="font-bold tabular-nums">{plan.totalLabel}</p>
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
