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

export interface ListedPageRequests {
  readonly list: RequestState
  readonly listCount: number | null
  readonly page: RequestState
  readonly segmentCount: number | null
}

export interface StatusMessages {
  readonly loadingList: string
  readonly emptyList: string
  readonly loadingPage: string
  readonly noSegments: string
}

const LAB_MESSAGES: StatusMessages = {
  loadingList: "Loading the fixtures.",
  emptyList: "There are no fixtures to show.",
  loadingPage: "Loading the fixture.",
  noSegments: "This fixture has no segment to show.",
}

export const requestStatusOf = (messages: StatusMessages, { list, listCount, page, segmentCount }: ListedPageRequests): string | null => {
  if (list.error !== null) return list.error.message
  if (list.isLoading) return messages.loadingList
  if (listCount === 0) return messages.emptyList
  if (page.error !== null) return page.error.message
  if (page.isLoading) return messages.loadingPage
  return segmentCount === 0 ? messages.noSegments : null
}

export const labStatusOf = ({ fixtures, fixtureCount, page, segmentCount }: LabRequests): string | null =>
  requestStatusOf(LAB_MESSAGES, { list: fixtures, listCount: fixtureCount, page, segmentCount })
