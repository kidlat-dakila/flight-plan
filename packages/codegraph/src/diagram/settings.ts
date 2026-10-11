export interface DiagramSettings {
  readonly levels: number | null
  readonly isShowingData: boolean
  readonly isShowingAssumed: boolean
}

export const DEFAULT_DIAGRAM_SETTINGS: DiagramSettings = {
  levels: null,
  isShowingData: false,
  isShowingAssumed: true,
}
