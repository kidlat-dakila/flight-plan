import { useId, useState, type ReactNode } from "react"
import IgnoredPathsField, { type RowProblem } from "@/components/IgnoredPathsField"
import SectionOrderField, { type ArrangedSection } from "@/components/SectionOrderField"
import SectionWriteUpsField, { type SectionWriteUps } from "@/components/SectionWriteUpsField"
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
  readonly promptConfigurationNotes: readonly string[]
  readonly children: ReactNode
  readonly onSubmit: (choice: ReviewConfigurationChoice<Classification>) => void
}

const SECTION_HEADING_CLASSES = "text-lg leading-7 font-semibold text-signal-text"
const SECTION_INTRO_CLASSES = "mt-1 max-w-[62ch] pb-4 text-muted-foreground"
const SPOTLIGHT_TITLE = "Which topics do you care about most in a code review?"
const SPOTLIGHT_INTRO = "Flight Plan will mark changes on these topics in every review, so they stand out. It can also list them first in the Code Walkthrough."
const WRITE_UPS_TITLE = "Write-ups"
const WRITE_UPS_INTRO = "Which parts should the agent write up by default? Always means the agent writes that part each time it writes a review. On demand means it leaves the part out, and you ask for it in the review when you want it."
const PROMPT_CONFIGURATION_TITLE = "Prompt configuration"
const PROMPT_CONFIGURATION_INTRO = "A prompt configuration is the set of instructions the agent follows when it writes a review: the tone it writes in and how it words each part. The structure of a review stays the same."
const ORGANIZATION_TITLE = "Review organization"
const ORGANIZATION_INTRO = "Choose whether a review is split into segments and how the Code Walkthrough orders its files."
const SEGMENTS_LABEL = "Split reviews into segments"
const SEGMENTS_HINT = "Flight Plan groups the changed files into segments, each with its own Context, Trace Diagram, Blast Diagram and Code Walkthrough. With segments off, a review is one segment with one Context for the whole change, and each Trace Diagram gets a tab of its own."
const ARRANGEMENT_TITLE = "Display arrangement"
const ARRANGEMENT_INTRO = "Choose the order of the four sections in each segment."
const IGNORED_FILES_TITLE = "Ignored files"
const IGNORED_FILES_INTRO = "Flight Plan leaves the files these patterns match out of every review. Write each pattern from the root of the repository, as in a .gitignore. To start with, the list leaves out tests in TypeScript and Python, e2e tests included."
const IGNORED_PATHS_FIELD = "ignoredPaths"

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

interface DefaultConfigurationChoiceProps {
  readonly presets: readonly PresetOption[]
  readonly chosenId: string
  readonly onChoose: (configurationId: string) => void
}

const DefaultConfigurationChoice = ({ presets, chosenId, onChoose }: DefaultConfigurationChoiceProps) => {
  const groupId = useId()
  return (
    <ul className="border-t border-border">
      {presets.map((option) => (
        <li key={option.configurationId} className="border-b border-border py-3">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="radio"
              name={groupId}
              checked={chosenId === option.configurationId}
              className="mt-1 size-4 shrink-0 accent-(--primary)"
              onChange={() => { onChoose(option.configurationId) }}
            />
            <span className="min-w-0">
              <span className="block font-bold">{option.label}</span>
              <span className="block max-w-[62ch] text-sm">{option.bestFor}</span>
              <span className="block max-w-[62ch] text-sm text-muted-foreground">{option.description}</span>
              {option.note === null
                ? null
                : <span className="block max-w-[62ch] text-sm text-muted-foreground">{option.note}</span>}
            </span>
          </label>
        </li>
      ))}
    </ul>
  )
}

interface SegmentsChoiceProps {
  readonly isSegmented: boolean
  readonly onChange: (isSegmented: boolean) => void
}

const SegmentsChoice = ({ isSegmented, onChange }: SegmentsChoiceProps) => {
  const hintId = useId()
  return (
    <label className="grid cursor-pointer grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 pb-6">
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
  promptConfigurationNotes,
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
  return (
    <form
      className="grid gap-10"
      action={() => { onSubmit({ configurationId, preferences: { spotlight, sectionWriteUps, isSegmented, walkthroughOrder, sectionOrder, ignoredPaths } }) }}
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
            <DefaultConfigurationChoice presets={presets} chosenId={configurationId} onChoose={setConfigurationId} />
            {promptConfigurationNotes.length === 0
              ? null
              : (
                  <ul className="max-w-[62ch] list-disc pt-4 pl-5 text-sm text-muted-foreground">
                    {promptConfigurationNotes.map((note) => <li key={note}>{note}</li>)}
                  </ul>
                )}
          </>
        )}
      </PartSection>
      <PartSection title={ORGANIZATION_TITLE} intro={ORGANIZATION_INTRO}>
        {() => (
          <>
            <SegmentsChoice isSegmented={isSegmented} onChange={setIsSegmented} />
            <WalkthroughOrderField value={walkthroughOrder} onChange={setWalkthroughOrder} />
          </>
        )}
      </PartSection>
      <PartSection title={ARRANGEMENT_TITLE} intro={ARRANGEMENT_INTRO}>
        {(headingId) => <SectionOrderField labelledBy={headingId} value={sectionOrder} onChange={setSectionOrder} />}
      </PartSection>
      <PartSection title={IGNORED_FILES_TITLE} intro={IGNORED_FILES_INTRO}>
        {(headingId) => (
          <IgnoredPathsField
            labelledBy={headingId}
            value={ignoredPaths}
            problem={ignoredPathProblemOf(problem)}
            onChange={setIgnoredPaths}
          />
        )}
      </PartSection>
      <div>{children}</div>
    </form>
  )
}

export default ReviewConfigurationForm
