import { nextSidePanel, panelOfKey } from "@/lib/review-panels"

describe("panelOfKey", () => {
  it("names the panel each shortcut toggles", () => {
    expect(panelOfKey("ctrl+e", false)).toBe("explorer")
    expect(panelOfKey("ctrl+a", false)).toBe("sections")
    expect(panelOfKey("ctrl+c", false)).toBe("chat")
    expect(panelOfKey("ctrl+g", false)).toBeNull()
    expect(panelOfKey("e", false)).toBeNull()
  })

  it("leaves Ctrl+C to copying while text is selected", () => {
    expect(panelOfKey("ctrl+c", true)).toBeNull()
    expect(panelOfKey("ctrl+e", true)).toBe("explorer")
  })
})

describe("nextSidePanel", () => {
  it("shows the pressed panel, and hides the right panel when the open one is pressed", () => {
    expect(nextSidePanel(null, "chat")).toBe("chat")
    expect(nextSidePanel("sections", "chat")).toBe("chat")
    expect(nextSidePanel("chat", "chat")).toBeNull()
  })
})
