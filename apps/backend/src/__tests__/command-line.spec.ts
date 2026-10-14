import { HELP_TEXT, parseCommand } from "@/command-line"

describe("parseCommand", () => {
  it("launches on the default port and opens the browser when nothing is given", () => {
    expect(parseCommand([])).toStrictEqual({ kind: "launch", port: null, shouldOpenBrowser: true })
  })

  it("reads --port", () => {
    expect(parseCommand(["--port", "8080"])).toStrictEqual({ kind: "launch", port: 8080, shouldOpenBrowser: true })
  })

  it("leaves the browser closed with --no-open", () => {
    expect(parseCommand(["--no-open"])).toStrictEqual({ kind: "launch", port: null, shouldOpenBrowser: false })
  })

  it.each([["--help"], ["-h"]])("asks for help with %s", (flag) => {
    expect(parseCommand([flag])).toStrictEqual({ kind: "help" })
  })

  it.each([["--version"], ["-v"]])("asks for the version with %s", (flag) => {
    expect(parseCommand([flag])).toStrictEqual({ kind: "version" })
  })

  it.each([["abc"], ["0"], ["70000"]])("rejects the port %s", (rawPort) => {
    expect(parseCommand(["--port", rawPort])).toStrictEqual({
      kind: "invalid",
      message: "--port takes a number between 1 and 65535.",
    })
  })

  it("rejects an option it does not know", () => {
    expect(parseCommand(["--watch"])).toMatchObject({ kind: "invalid" })
  })

  it("rejects a positional argument", () => {
    expect(parseCommand(["start"])).toMatchObject({ kind: "invalid" })
  })
})

describe("HELP_TEXT", () => {
  it("names the default port", () => {
    expect(HELP_TEXT).toContain("instead of 24747")
  })
})
