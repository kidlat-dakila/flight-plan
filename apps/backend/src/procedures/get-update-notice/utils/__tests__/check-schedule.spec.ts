import { isCheckDue } from "@/procedures/get-update-notice/utils/check-schedule"

const CHECKED_AT = "2026-10-20T09:00:00.000Z"
const check = { checkedAt: CHECKED_AT, latestVersion: "0.2.0" }

describe("isCheckDue", () => {
  it("asks when nothing was checked yet", () => {
    expect(isCheckDue(null, new Date(CHECKED_AT))).toBe(true)
  })

  it("keeps the stored answer within the day", () => {
    expect(isCheckDue(check, new Date("2026-10-21T08:59:59.999Z"))).toBe(false)
  })

  it("asks again once a day has passed", () => {
    expect(isCheckDue(check, new Date("2026-10-21T09:00:00.000Z"))).toBe(true)
  })

  it("asks again when the stored check lies in the future", () => {
    expect(isCheckDue(check, new Date("2026-10-19T09:00:00.000Z"))).toBe(true)
  })
})
