import { ChevronDownIcon } from "lucide-react"
import { useId, useState, type ReactNode } from "react"
import Collapsible, { CollapsibleContent, CollapsibleTrigger } from "@/components/blocks/collapsible"
import IgnoredPathsField, { type RowProblem } from "@/components/IgnoredPathsField"
import InfoCallout from "@/components/InfoCallout"
import SectionOrderField, { type ArrangedSection } from "@/components/SectionOrderField"
import SectionWriteUpsField, { type SectionWriteUps } from "@/components/SectionWriteUpsField"
import SelectDialog, { type SelectDialogOption } from "@/components/SelectDialog"
import SpotlightField, { type SpotlightGroup } from "@/components/SpotlightField"
import WalkthroughOrderField, { type WalkthroughOrder } from "@/components/WalkthroughOrderField"
import type { FormProblem } from "@/lib/form-problem"

export interface ReviewPreferences<Classification extends string> {
  readonly spotlight: Classification[]
  readonly sectionWriteUps: SectionWriteUps
  readonly isSegmented: boolean
  readonly walkthroughOrder: WalkthroughOrder
  readonly sectionOrder: ArrangedSection[]
  readonly ignoredPaths: string[]
}

interface PresetOption {
  readonly configurationId: string
  readonly label: string
  readonly bestFor: string
  readonly description: string
  readonly note: string | null
}

export interface ReviewConfigurationChoice<Classification extends string> {
  readonly configurationId: string
  readonly preferences: ReviewPreferences<Classification>
}

interface ReviewConfigurationFormProps<Classification extends string> {
  readonly presets: readonly PresetOption[]
  readonly selectedConfigurationId: string
  readonly preferences: ReviewPreferences<Classification>
  readonly spotlightGroups: readonly SpotlightGroup<Classification>[]
  readonly problem: FormProblem | null
  readonly children: ReactNode
  readonly onSubmit: (choice: ReviewConfigurationChoice<Classification>) => void
}

const SECTION_HEADING_CLASSES = "text-lg leading-7 font-semibold text-signal-text"
const SECTION_INTRO_CLASSES = "mt-1 max-w-[62ch] pb-4 text-muted-foreground"
const SPOTLIGHT_TITLE = "Which topics do you care about most in a code review?"
const SPOTLIGHT_INTRO = "Selecting a topic helps Flight Plan organize the changes based on what you think are the most important bits when reviewing a pull request, and makes it easier for you to navigate the changes."
const WRITE_UPS_TITLE = "Which parts should the agent write for you by default?"
const WRITE_UPS_INTRO = "Pick the sections you want the agent to write in every review. For anything else, you can ask it to explain just the code you want, right from the review."
const PROMPT_CONFIGURATION_TITLE = "Which writing style should the agent use?"
const PROMPT_CONFIGURATION_LABEL = "Prompt configuration"
const PROMPT_CONFIGURATION_INTRO = "Each prompt configuration gives the agent a different way of writing, from short notes to explanations for someone new to the code. The structure of the review stays the same."
const PROMPT_CONFIGURATION_DIALOG_TITLE = "Choose a prompt configuration"
const PROMPT_CONFIGURATION_DIALOG_DESCRIPTION = "It sets the tone the agent writes in and how it words each part."
const CHOOSE_LABEL = "Choose"
const CUSTOMIZATION_TITLE = "You can fully customize the prompt instructions"
const CUSTOMIZATION_TEXT = "You can make your own prompt configuration in Settings > Prompt configurations and rewrite how the agent words each part of the review, down to its writing style. You can also pick a different configuration each time you create a Flight Plan."
const CANCEL_LABEL = "Cancel"
const ORGANIZATION_TITLE = "Review organization"
const ORGANIZATION_INTRO = "Choose whether a review is split into segments."
const WALKTHROUGH_ORDER_TITLE = "Code Walkthrough order"
const WALKTHROUGH_ORDER_INTRO = "Choose the order the Code Walkthrough takes you through the changed files."
const SEGMENTS_LABEL = "Split reviews into segments"
const SEGMENTS_HINT = "Flight Plan groups the changed files into segments, each with its own Context, Trace Diagram, Blast Diagram and Code Walkthrough. With segments off, a review is one segment with one Context for the whole change, and each Trace Diagram gets a tab of its own."
const ARRANGEMENT_TITLE = "Display arrangement"
const ARRANGEMENT_INTRO = "Choose the order of the four sections in each segment."
const IGNORED_FILES_TITLE = "Ignored files"
const IGNORED_FILES_INTRO = "Flight Plan leaves the files these patterns match out of every review. Write each pattern from the root of the repository, as in a .gitignore. To start with, the list leaves out tests in TypeScript and Python, e2e tests included."
const IGNORED_PATHS_FIELD = "ignoredPaths"
const ADVANCED_TITLE = "Advanced options"
const ADVANCED_SUMMARY = "Segments, section order and ignored files"

const ignoredPathProblemOf = (problem: FormProblem | null): RowProblem | null =>
  problem?.field?.owner === IGNORED_PATHS_FIELD ? { position: Number(problem.field.name), message: problem.message } : null

interface PartSectionProps {
  readonly title: string
  readonly intro: string
  readonly children: (headingId: string) => ReactNode
}

const PartSection = ({ title, intro, children }: PartSectionProps) => {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId}>
      <h3 id={headingId} className={SECTION_HEADING_CLASSES}>{title}</h3>
      <p className={SECTION_INTRO_CLASSES}>{intro}</p>
      {children(headingId)}
    </section>
  )
}

const toSelectOption = (preset: PresetOption): SelectDialogOption => ({
  key: preset.configurationId,
  label: preset.label,
  summary: preset.bestFor,
  description: preset.description,
  note: preset.note,
})

interface AdvancedOptionsProps {
  readonly isOpen: boolean
  readonly onOpenChange: (isOpen: boolean) => void
  readonly children: ReactNode
}

const AdvancedOptions = ({ isOpen, onOpenChange, children }: AdvancedOptionsProps) => (
  <Collapsible open={isOpen} onOpenChange={onOpenChange} className="border-t border-border">
    <CollapsibleTrigger className="group -mx-2 flex w-[calc(100%+1rem)] cursor-pointer items-center gap-3 rounded-sm px-2 py-4 text-left transition-colors duration-[180ms] ease-out outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
      <span className="min-w-0 flex-1">
        <span className="block text-lg leading-7 font-bold">{ADVANCED_TITLE}</span>
        <span className="block text-sm text-muted-foreground">{ADVANCED_SUMMARY}</span>
      </span>
      <ChevronDownIcon aria-hidden="true" className="size-5 shrink-0 text-muted-foreground transition-transform duration-[180ms] ease-out group-data-[panel-open]:rotate-180" />
    </CollapsibleTrigger>
    <CollapsibleContent className="grid gap-10 pt-6">{children}</CollapsibleContent>
  </Collapsible>
)

interface SegmentsChoiceProps {
  readonly isSegmented: boolean
  readonly onChange: (isSegmented: boolean) => void
}

const SegmentsChoice = ({ isSegmented, onChange }: SegmentsChoiceProps) => {
  const hintId = useId()
  return (
    <label className="grid cursor-pointer grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3">
      <input
        type="checkbox"
        checked={isSegmented}
        aria-describedby={hintId}
        className="mt-1 size-4 shrink-0 accent-(--primary)"
        onChange={(event) => { onChange(event.target.checked) }}
      />
      <span className="font-bold">{SEGMENTS_LABEL}</span>
      <span id={hintId} className="col-start-2 max-w-[62ch] text-sm text-muted-foreground">{SEGMENTS_HINT}</span>
    </label>
  )
}

const ReviewConfigurationForm = <Classification extends string>({
  presets,
  selectedConfigurationId,
  preferences,
  spotlightGroups,
  problem,
  children,
  onSubmit,
}: ReviewConfigurationFormProps<Classification>) => {
  const [configurationId, setConfigurationId] = useState(selectedConfigurationId)
  const [spotlight, setSpotlight] = useState(preferences.spotlight)
  const [sectionWriteUps, setSectionWriteUps] = useState(preferences.sectionWriteUps)
  const [isSegmented, setIsSegmented] = useState(preferences.isSegmented)
  const [walkthroughOrder, setWalkthroughOrder] = useState(preferences.walkthroughOrder)
  const [sectionOrder, setSectionOrder] = useState(preferences.sectionOrder)
  const [ignoredPaths, setIgnoredPaths] = useState(preferences.ignoredPaths)
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)
  const ignoredPathProblem = ignoredPathProblemOf(problem)
  return (
    <form
      className="grid gap-10"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit({ configurationId, preferences: { spotlight, sectionWriteUps, isSegmented, walkthroughOrder, sectionOrder, ignoredPaths } })
      }}
    >
      <PartSection title={SPOTLIGHT_TITLE} intro={SPOTLIGHT_INTRO}>
        {(headingId) => (
          <SpotlightField labelledBy={headingId} groups={spotlightGroups} picked={spotlight} onChange={setSpotlight} />
        )}
      </PartSection>
      <PartSection title={WRITE_UPS_TITLE} intro={WRITE_UPS_INTRO}>
        {(headingId) => <SectionWriteUpsField labelledBy={headingId} value={sectionWriteUps} onChange={setSectionWriteUps} />}
      </PartSection>
      <PartSection title={PROMPT_CONFIGURATION_TITLE} intro={PROMPT_CONFIGURATION_INTRO}>
        {() => (
          <>
            <SelectDialog
              label={PROMPT_CONFIGURATION_LABEL}
              dialogTitle={PROMPT_CONFIGURATION_DIALOG_TITLE}
              dialogDescription={PROMPT_CONFIGURATION_DIALOG_DESCRIPTION}
              chooseLabel={CHOOSE_LABEL}
              cancelLabel={CANCEL_LABEL}
              options={presets.map(toSelectOption)}
              selectedKey={configurationId}
              onChoose={setConfigurationId}
            />
            <InfoCallout title={CUSTOMIZATION_TITLE} className="mt-4 max-w-xl">{CUSTOMIZATION_TEXT}</InfoCallout>
          </>
        )}
      </PartSection>
      <PartSection title={WALKTHROUGH_ORDER_TITLE} intro={WALKTHROUGH_ORDER_INTRO}>
        {() => <WalkthroughOrderField value={walkthroughOrder} onChange={setWalkthroughOrder} />}
      </PartSection>
      <AdvancedOptions isOpen={isAdvancedOpen || ignoredPathProblem !== null} onOpenChange={setIsAdvancedOpen}>
        <PartSection title={ORGANIZATION_TITLE} intro={ORGANIZATION_INTRO}>
          {() => <SegmentsChoice isSegmented={isSegmented} onChange={setIsSegmented} />}
        </PartSection>
        <PartSection title={ARRANGEMENT_TITLE} intro={ARRANGEMENT_INTRO}>
          {(headingId) => <SectionOrderField labelledBy={headingId} value={sectionOrder} onChange={setSectionOrder} />}
        </PartSection>
        <PartSection title={IGNORED_FILES_TITLE} intro={IGNORED_FILES_INTRO}>
          {(headingId) => (
            <IgnoredPathsField
              labelledBy={headingId}
              value={ignoredPaths}
              problem={ignoredPathProblem}
              onChange={setIgnoredPaths}
            />
          )}
        </PartSection>
      </AdvancedOptions>
      <div>{children}</div>
    </form>
  )
}

export default ReviewConfigurationForm
