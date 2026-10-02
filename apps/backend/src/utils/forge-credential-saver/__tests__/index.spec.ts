import { createForgeCredentialSaver, type Keychain } from "@/utils/forge-credential-saver"

describe("createForgeCredentialSaver", () => {
  it("files the token in the keychain under Flight Plan, one entry per forge", async () => {
    const keychain = vi.fn<Keychain>().mockResolvedValue()

    await expect(createForgeCredentialSaver(keychain)("github", "secret")).resolves.toStrictEqual({ kind: "saved" })
    expect(keychain.mock.calls).toStrictEqual([["flightplan", "github", "secret"]])
  })

  it("says why the keychain refused, without repeating the token", async () => {
    const keychain = vi.fn<Keychain>().mockRejectedValue(new Error("No Secret Service for secret"))

    const saving = await createForgeCredentialSaver(keychain)("gitlab", "secret")

    expect(saving).toStrictEqual({ kind: "failed", reason: "The system keychain refused it: No Secret Service for ***" })
  })
})
