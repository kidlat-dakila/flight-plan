import { browserCommandOf } from "@/utils/browser-opener"

const URL = "http://localhost:24747"

describe("browserCommandOf", () => {
  it("uses open on macOS", () => {
    expect(browserCommandOf("darwin", URL)).toStrictEqual({ executable: "open", commandArguments: [URL] })
  })

  it("uses start on Windows, with an empty window title before the address", () => {
    expect(browserCommandOf("win32", URL)).toStrictEqual({
      executable: "cmd",
      commandArguments: ["/c", "start", "", URL],
    })
  })

  it("uses xdg-open elsewhere", () => {
    expect(browserCommandOf("linux", URL)).toStrictEqual({ executable: "xdg-open", commandArguments: [URL] })
  })
})
