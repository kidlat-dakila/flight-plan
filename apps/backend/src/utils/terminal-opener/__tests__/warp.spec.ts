import { WARP_TAB_CONFIG_URL, warpOpeningOf, warpTabConfigOf, warpTabConfigPathOf } from "@/utils/terminal-opener/warp"

describe("warpTabConfigPathOf", () => {
  it("keeps Flight Plan's Tab Config in Warp's folder", () => {
    expect(warpTabConfigPathOf("/Users/dana")).toBe("/Users/dana/.warp/tab_configs/flightplan.toml")
  })
})

describe("warpTabConfigOf", () => {
  it("opens one focused pane that runs the command", () => {
    expect(warpTabConfigOf("cd '/x' && claude \"a\\b\"")).toBe([
      "name = \"Flight Plan\"",
      "",
      "[[panes]]",
      "id = \"agent\"",
      "type = \"terminal\"",
      String.raw`commands = ["cd '/x' && claude \"a\\b\""]`,
      "is_focused = true",
      "",
    ].join("\n"))
  })
})

describe("WARP_TAB_CONFIG_URL", () => {
  it("opens the Tab Config by its file name", () => {
    expect(WARP_TAB_CONFIG_URL).toBe("warp://tab_config/flightplan")
  })
})

describe("warpOpeningOf", () => {
  it("keeps the file the shell writes its tty to", () => {
    expect(warpOpeningOf("/tmp/flightplan-tty-1f2e")).toStrictEqual({
      kind: "opened",
      tab: { terminalApp: "warp", ttyPath: "/tmp/flightplan-tty-1f2e" },
      isWindowFallback: false,
    })
  })
})
