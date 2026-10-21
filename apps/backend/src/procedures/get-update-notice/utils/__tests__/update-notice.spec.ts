import { GLOBAL_INSTALL_COMMAND, NPX_COMMAND } from "@/procedures/get-published-review/utils/install-guide"
import { buildUpdateNotice, toTerminalLine, updateCommandOf } from "@/procedures/get-update-notice/utils/update-notice"

const NPX_INSTALL_PATH = "/Users/ada/.npm/_npx/3f1c2a/node_modules/@kidlat-dakila/flightplan/backend"
const GLOBAL_INSTALL_PATH = "/usr/local/lib/node_modules/@kidlat-dakila/flightplan/backend"

describe("updateCommandOf", () => {
  it("gives the npx command to a copy npx runs from its cache", () => {
    expect(updateCommandOf(NPX_INSTALL_PATH)).toBe("npx @kidlat-dakila/flightplan@latest")
  })

  it("gives the npx command to a copy in the npx cache on Windows", () => {
    expect(updateCommandOf("C:\\Users\\ada\\AppData\\Local\\npm-cache\\_npx\\3f1c2a\\node_modules")).toBe(NPX_COMMAND)
  })

  it("gives the global install command to any other copy", () => {
    expect(updateCommandOf(GLOBAL_INSTALL_PATH)).toBe("npm install -g @kidlat-dakila/flightplan@latest")
  })
})

describe("buildUpdateNotice", () => {
  it("words the notice of a newer version, with its release notes", () => {
    expect(buildUpdateNotice({ latestVersion: "0.2.0", runningVersion: "0.1.6", installPath: NPX_INSTALL_PATH })).toStrictEqual({
      latestVersion: "0.2.0",
      runningVersion: "0.1.6",
      command: NPX_COMMAND,
      title: "Flight Plan 0.2.0 is out",
      description: "You have 0.1.6. Update with this command.",
      copyLabel: "Copy command",
      copiedLabel: "Copied",
      releaseNotesLabel: "What's new in 0.2.0",
      releaseNotesUrl: "https://github.com/kidlat-dakila/flight-plan/releases/tag/v0.2.0",
      closeLabel: "Close",
    })
  })

  it("gives no notice when the running version is the latest", () => {
    expect(buildUpdateNotice({ latestVersion: "0.1.6", runningVersion: "0.1.6", installPath: NPX_INSTALL_PATH })).toBeNull()
  })

  it("gives no notice for a version it cannot read", () => {
    expect(buildUpdateNotice({ latestVersion: "<html>", runningVersion: "0.1.6", installPath: NPX_INSTALL_PATH })).toBeNull()
  })
})

describe("toTerminalLine", () => {
  it("says the new version, the running one and the command in one line", () => {
    const notice = buildUpdateNotice({ latestVersion: "0.2.0", runningVersion: "0.1.6", installPath: GLOBAL_INSTALL_PATH })

    expect(notice === null ? null : toTerminalLine(notice)).toBe(
      `Flight Plan 0.2.0 is out. You have 0.1.6. Update with ${GLOBAL_INSTALL_COMMAND}`,
    )
  })
})
