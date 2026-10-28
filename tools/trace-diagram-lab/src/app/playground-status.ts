import { requestStatusOf, type ListedPageRequests, type StatusMessages } from "./lab-status"

const PLAYGROUND_MESSAGES: StatusMessages = {
  loadingList: "Loading the playgrounds.",
  emptyList: "There are no playgrounds to show.",
  loadingPage: "Loading the playground.",
  noSegments: "This playground has no segment to show.",
}

export const playgroundStatusOf = (requests: ListedPageRequests): string | null => requestStatusOf(PLAYGROUND_MESSAGES, requests)
