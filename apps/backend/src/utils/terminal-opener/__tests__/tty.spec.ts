import { deviceNameOf, ttyOf, ttyPathOf, ttyRecordingCommandOf } from "@/utils/terminal-opener/tty"

describe("ttyOf", () => {
  it("reads the tty the shell wrote", () => {
    expect(ttyOf("/dev/ttys007\n")).toBe("/dev/ttys007")
  })

  it("gives no tty for anything else", () => {
    expect(ttyOf("")).toBeNull()
    expect(ttyOf("not a tty")).toBeNull()
    expect(ttyOf("/dev/ttys007; rm -rf ~")).toBeNull()
  })
})

describe("deviceNameOf", () => {
  it("drops the /dev/ folder", () => {
    expect(deviceNameOf("/dev/ttys007")).toBe("ttys007")
  })
})

describe("ttyPathOf", () => {
  it("names a file of its own in the temporary folder", () => {
    expect(ttyPathOf("/var/folders/tmp", "1f2e")).toBe("/var/folders/tmp/flightplan-tty-1f2e")
  })
})

describe("ttyRecordingCommandOf", () => {
  it("has the shell write its tty to the file before it runs the command", () => {
    expect(ttyRecordingCommandOf("cd '/x' && claude", "/tmp/it's/flightplan-tty-1f2e")).toBe(String.raw`tty > '/tmp/it'\''s/flightplan-tty-1f2e' && cd '/x' && claude`)
  })
})
