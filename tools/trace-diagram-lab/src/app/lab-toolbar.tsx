import Button from "@flightplan/ui/blocks/button"
import SelectField from "@flightplan/ui/SelectField"
import type { SelectOption } from "./lab-selection"

interface LabToolbarProps {
  readonly fixtureOptions: readonly SelectOption[]
  readonly fixtureId: string | null
  readonly previousFixtureId: string | null
  readonly nextFixtureId: string | null
  readonly diagramOptions: readonly SelectOption[]
  readonly diagramId: string | null
  readonly statusMessage: string | null
  readonly onFixtureChange: (fixtureId: string) => void
  readonly onDiagramChange: (diagramId: string) => void
}

const TOOLBAR_LABEL = "Trace Diagram lab"
const FIXTURE_LABEL = "Fixture"
const DIAGRAM_LABEL = "Diagram"
const PREVIOUS_LABEL = "Previous"
const NEXT_LABEL = "Next"
const DIAGRAM_CHOICE_MINIMUM = 2

const LabToolbar = ({
  fixtureOptions,
  fixtureId,
  previousFixtureId,
  nextFixtureId,
  diagramOptions,
  diagramId,
  statusMessage,
  onFixtureChange,
  onDiagramChange,
}: LabToolbarProps) => (
  <div
    role="toolbar"
    aria-label={TOOLBAR_LABEL}
    data-testid="lab-toolbar"
    className="fixed bottom-3 left-3 z-[60] flex max-w-[calc(100vw-1.5rem)] items-center gap-2 rounded-md border border-input bg-card p-1.5 text-sm text-foreground"
  >
    <Button
      variant="outline"
      size="sm"
      data-testid="previous-fixture"
      disabled={previousFixtureId === null}
      onClick={() => { if (previousFixtureId !== null) onFixtureChange(previousFixtureId) }}
    >
      {PREVIOUS_LABEL}
    </Button>
    {fixtureId === null
      ? null
      : (
          <div data-testid="fixture-select" className="w-[32rem] max-w-[50vw]">
            <SelectField label={FIXTURE_LABEL} isLabelHidden options={fixtureOptions} value={fixtureId} onChange={onFixtureChange} />
          </div>
        )}
    <Button
      variant="outline"
      size="sm"
      data-testid="next-fixture"
      disabled={nextFixtureId === null}
      onClick={() => { if (nextFixtureId !== null) onFixtureChange(nextFixtureId) }}
    >
      {NEXT_LABEL}
    </Button>
    {diagramId === null || diagramOptions.length < DIAGRAM_CHOICE_MINIMUM
      ? null
      : (
          <div data-testid="diagram-select" className="w-72 max-w-[25vw]">
            <SelectField label={DIAGRAM_LABEL} isLabelHidden options={diagramOptions} value={diagramId} onChange={onDiagramChange} />
          </div>
        )}
    {statusMessage === null ? null : <p role="status" data-testid="lab-status" className="px-1 text-muted-foreground">{statusMessage}</p>}
  </div>
)

export default LabToolbar
