import { saveLayoutPreferences } from "@/lib/layout-preferences"

const STORAGE_KEY = "flight-plan:layout:v1"

describe("saveLayoutPreferences", () => {
  afterEach(() => {
    window.localStorage.removeItem(STORAGE_KEY)
  })

  it("keeps the widths it is not given", () => {
    saveLayoutPreferences({ diagramPanelWidthPx: 700 })
    saveLayoutPreferences({ explorerWidthPx: 320 })

    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}")).toStrictEqual({
      diagramPanelWidthPx: 700,
      explorerWidthPx: 320,
      sectionsWidthPx: null,
      chatWidthPx: null,
    })
  })
})
