export interface RequestState {
  readonly isLoading: boolean
  readonly error: Error | null
}

export interface LabRequests {
  readonly fixtures: RequestState
  readonly fixtureCount: number | null
  readonly page: RequestState
  readonly segmentCount: number | null
}

const LOADING_FIXTURES_MESSAGE = "Loading the fixtures."
const NO_FIXTURES_MESSAGE = "There are no fixtures to show."
const LOADING_FIXTURE_MESSAGE = "Loading the fixture."
const NO_SEGMENTS_MESSAGE = "This fixture has no segment to show."

export const labStatusOf = ({ fixtures, fixtureCount, page, segmentCount }: LabRequests): string | null => {
  if (fixtures.error !== null) return fixtures.error.message
  if (fixtures.isLoading) return LOADING_FIXTURES_MESSAGE
  if (fixtureCount === 0) return NO_FIXTURES_MESSAGE
  if (page.error !== null) return page.error.message
  if (page.isLoading) return LOADING_FIXTURE_MESSAGE
  return segmentCount === 0 ? NO_SEGMENTS_MESSAGE : null
}
