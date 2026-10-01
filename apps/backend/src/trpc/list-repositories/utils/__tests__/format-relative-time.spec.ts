import { formatRelativeTime } from "@/trpc/list-repositories/utils/format-relative-time"

const NOW = new Date("2026-10-01T12:00:00.000Z")

describe("formatRelativeTime", () => {
  it("says just now for less than a minute", () => {
    expect(formatRelativeTime(new Date("2026-10-01T11:59:30.000Z"), NOW)).toBe("just now")
  })

  it("counts whole minutes", () => {
    expect(formatRelativeTime(new Date("2026-10-01T11:21:10.000Z"), NOW)).toBe("38 minutes ago")
  })

  it("counts whole hours once an hour has passed", () => {
    expect(formatRelativeTime(new Date("2026-10-01T08:50:00.000Z"), NOW)).toBe("3 hours ago")
  })

  it("counts whole days once a day has passed", () => {
    expect(formatRelativeTime(new Date("2026-09-29T11:00:00.000Z"), NOW)).toBe("2 days ago")
  })

  it("uses the singular for one unit", () => {
    expect(formatRelativeTime(new Date("2026-10-01T11:00:00.000Z"), NOW)).toBe("1 hour ago")
  })
})
