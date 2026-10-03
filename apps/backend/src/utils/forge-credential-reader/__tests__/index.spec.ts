import { createForgeCredentialReader, type KeychainReader } from "@/utils/forge-credential-reader"

describe("createForgeCredentialReader", () => {
  it("reads the credential of a forge from the flightplan service", async () => {
    const keychain = vi.fn<KeychainReader>(async () => await Promise.resolve("secret-token"))

    await expect(createForgeCredentialReader(keychain)("github")).resolves.toBe("secret-token")
    expect(keychain).toHaveBeenCalledExactlyOnceWith("flightplan", "github")
  })

  it("reports no credential when the keychain has none", async () => {
    await expect(createForgeCredentialReader(async () => await Promise.resolve(null))("gitlab")).resolves.toBeNull()
  })

  it("reports no credential when the keychain cannot be read", async () => {
    const keychain: KeychainReader = async () => await Promise.reject(new Error("keychain locked"))

    await expect(createForgeCredentialReader(keychain)("bitbucket")).resolves.toBeNull()
  })
})
