import { isNewerVersion } from "@/procedures/get-update-notice/utils/versions"

describe("isNewerVersion", () => {
  it.each([
    ["0.2.0", "0.1.6"],
    ["1.0.0", "0.9.9"],
    ["0.1.10", "0.1.9"],
    ["0.2.0", "0.2.0-beta.1"],
    ["v0.2.0", "0.1.6"],
  ])("takes %s for newer than %s", (candidate, current) => {
    expect(isNewerVersion(candidate, current)).toBe(true)
  })

  it.each([
    ["0.1.6", "0.1.6"],
    ["0.1.5", "0.1.6"],
    ["0.1.9", "0.1.10"],
    ["0.2.0-beta.1", "0.2.0"],
    ["0.2.0-beta.2", "0.2.0-beta.1"],
    ["latest", "0.1.6"],
    ["0.2", "0.1.6"],
    ["0.2.0", "unknown"],
  ])("does not take %s for newer than %s", (candidate, current) => {
    expect(isNewerVersion(candidate, current)).toBe(false)
  })
})
