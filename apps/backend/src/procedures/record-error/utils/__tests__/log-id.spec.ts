import { isLogId, logIdOf, recordedAtOf } from "@/procedures/record-error/utils/log-id"

describe("log ids", () => {
  it("names a log by its UTC time and a suffix", () => {
    expect(logIdOf(new Date("2026-10-23T14:25:30.900Z"), "a1b2c3d4")).toBe("20261023-142530-a1b2c3")
  })

  it("reads the time back from an id", () => {
    expect(recordedAtOf("20261023-142530-a1b2c3")).toStrictEqual(new Date("2026-10-23T14:25:30.000Z"))
  })

  it.each(["../secrets", "20261023-142530", "20261023-142530-A1B2C3", "20261023-142530-a1b2c3.json", ""])("refuses %s as an id", (text) => {
    expect(isLogId(text)).toBe(false)
    expect(recordedAtOf(text)).toBeNull()
  })
})
