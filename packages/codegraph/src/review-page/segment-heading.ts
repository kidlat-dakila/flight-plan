import type { Segment } from "@flightplan/configurations"

const segmentLabelOf = (position: number): string => `Segment ${String(position)}`

export const isUntitledSegment = (segment: Segment): boolean => segment.title.trim() === ""

export const segmentTitleOf = (segment: Segment, position: number): string =>
  isUntitledSegment(segment) ? segmentLabelOf(position) : segment.title

export const segmentHeadingOf = (segment: Segment, position: number): string =>
  isUntitledSegment(segment) ? segmentLabelOf(position) : `${segmentLabelOf(position)}: ${segment.title}`

export const shownSegmentHeadingOf = (segment: Segment, position: number, isSegmented: boolean): string | null =>
  isSegmented ? segmentHeadingOf(segment, position) : null
