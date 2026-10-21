import { getUpdateNotice } from "@/procedures/get-update-notice"
import type { UpdateCheck } from "@/procedures/get-update-notice/utils/schemas"
import type { UpdateChecker } from "@/procedures/get-update-notice/utils/update-checker"

const NOW = new Date("2026-10-21T09:00:00.000Z")
const INSTALL_PATH = "/Users/ada/.npm/_npx/3f1c2a/node_modules/@kidlat-dakila/flightplan/backend"

const createFakeChecker = (storedCheck: UpdateCheck | null, latestVersion: string | null) => {
  const write = vi.fn(async () => {
    await Promise.resolve()
  })
  const readLatestVersion = vi.fn(async () => await Promise.resolve(latestVersion))
  const checker: UpdateChecker = {
    runningVersion: "0.1.6",
    installPath: INSTALL_PATH,
    checkFile: { read: async () => await Promise.resolve(storedCheck), write },
    readLatestVersion,
  }
  return { checker, write, readLatestVersion }
}

const noticeOf = async (checker: UpdateChecker | undefined) =>
  await getUpdateNotice({}, { updateChecker: checker, now: () => NOW })

describe("getUpdateNotice", () => {
  it("asks the registry on a first start, keeps the answer and words the notice", async () => {
    const fake = createFakeChecker(null, "0.2.0")

    await expect(noticeOf(fake.checker)).resolves.toMatchObject({
      latestVersion: "0.2.0",
      runningVersion: "0.1.6",
      command: "npx @kidlat-dakila/flightplan@latest",
    })
    expect(fake.write).toHaveBeenCalledWith({ checkedAt: NOW.toISOString(), latestVersion: "0.2.0" })
  })

  it("uses the stored answer within the day and does not go to the registry", async () => {
    const fake = createFakeChecker({ checkedAt: "2026-10-21T01:00:00.000Z", latestVersion: "0.2.0" }, "0.3.0")

    await expect(noticeOf(fake.checker)).resolves.toMatchObject({ latestVersion: "0.2.0" })
    expect(fake.readLatestVersion).not.toHaveBeenCalled()
    expect(fake.write).not.toHaveBeenCalled()
  })

  it("asks again once the stored answer is a day old", async () => {
    const fake = createFakeChecker({ checkedAt: "2026-10-20T08:00:00.000Z", latestVersion: "0.2.0" }, "0.3.0")

    await expect(noticeOf(fake.checker)).resolves.toMatchObject({ latestVersion: "0.3.0" })
    expect(fake.readLatestVersion).toHaveBeenCalledOnce()
  })

  it("says nothing when the registry does not answer and nothing is stored", async () => {
    const fake = createFakeChecker(null, null)

    await expect(noticeOf(fake.checker)).resolves.toBeNull()
    expect(fake.write).not.toHaveBeenCalled()
  })

  it("keeps the old answer when the registry does not answer a day later", async () => {
    const fake = createFakeChecker({ checkedAt: "2026-10-19T08:00:00.000Z", latestVersion: "0.2.0" }, null)

    await expect(noticeOf(fake.checker)).resolves.toMatchObject({ latestVersion: "0.2.0" })
    expect(fake.write).not.toHaveBeenCalled()
  })

  it("says nothing when the running version is the latest", async () => {
    await expect(noticeOf(createFakeChecker(null, "0.1.6").checker)).resolves.toBeNull()
  })

  it("never checks without an update checker, as in a development build", async () => {
    await expect(noticeOf(undefined)).resolves.toBeNull()
  })
})
