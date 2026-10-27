import { appleScriptStringOf, killLineOf, scriptArgumentsOf, shortcutLineOf, waitUntilLinesOf } from "@/utils/terminal-opener/apple-script"

describe("appleScriptStringOf", () => {
  it("escapes backslashes and double quotes", () => {
    expect(appleScriptStringOf(String.raw`curl "a\b"`)).toBe(String.raw`"curl \"a\\b\""`)
  })
})

describe("scriptArgumentsOf", () => {
  it("gives osascript each line after its own -e", () => {
    expect(scriptArgumentsOf(["tell application \"Terminal\"", "end tell"])).toStrictEqual(["-e", "tell application \"Terminal\"", "-e", "end tell"])
  })
})

describe("waitUntilLinesOf", () => {
  it("waits in short steps until the condition holds", () => {
    expect(waitUntilLinesOf("frontmost", 0.1)).toStrictEqual(["repeat 20 times", "if frontmost then exit repeat", "delay 0.1", "end repeat"])
  })
})

describe("killLineOf", () => {
  it("ends every process on the tty", () => {
    expect(killLineOf("/dev/ttys007")).toBe("do shell script \"/usr/bin/pkill -t ttys007 || true\"")
  })
})

describe("shortcutLineOf", () => {
  it("presses the key with Command through System Events", () => {
    expect(shortcutLineOf("t")).toBe("tell application \"System Events\" to keystroke \"t\" using command down")
  })
})
