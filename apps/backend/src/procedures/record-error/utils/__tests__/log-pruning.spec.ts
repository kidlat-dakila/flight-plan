import { KEPT_LOG_COUNT, latestIds, planLogPruning } from "@/procedures/record-error/utils/log-pruning"

const NOW = new Date("2026-10-23T12:00:00.000Z")

describe("planLogPruning", () => {
  it("removes the logs older than 30 days", () => {
    expect(planLogPruning(["20260920-115959-000001", "20260923-120000-000002", "20261022-080000-000003"], NOW)).toStrictEqual(["20260920-115959-000001"])
  })

  it("keeps only the newest 500 logs", () => {
    const ids = Array.from({ length: KEPT_LOG_COUNT + 2 }, (_, index) => `20261023-${String(100_000 + index)}-000000`)

    expect(planLogPruning(ids, new Date("2026-10-23T23:00:00.000Z"))).toStrictEqual(["20261023-100001-000000", "20261023-100000-000000"])
  })

  it("removes nothing when every log is recent and there are few", () => {
    expect(planLogPruning(["20261020-120000-000001", "20261023-110000-000002"], NOW)).toStrictEqual([])
  })
})

describe("latestIds", () => {
  it("lists the newest ids first", () => {
    expect(latestIds(["20261021-120000-000001", "20261023-120000-000003", "20261022-120000-000002"], 2)).toStrictEqual(["20261023-120000-000003", "20261022-120000-000002"])
  })
})
