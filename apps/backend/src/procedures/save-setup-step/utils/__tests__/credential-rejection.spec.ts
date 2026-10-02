import { firstCredentialRejection } from "@/procedures/save-setup-step/utils/credential-rejection"

describe("firstCredentialRejection", () => {
  it("accepts when every token was saved", () => {
    expect(
      firstCredentialRejection([{ forge: "github", saving: { kind: "saved" } }]),
    ).toBeNull()
    expect(firstCredentialRejection([])).toBeNull()
  })

  it("rejects under the token field of the first forge whose token was not saved", () => {
    expect(
      firstCredentialRejection([
        { forge: "github", saving: { kind: "saved" } },
        { forge: "bitbucket", saving: { kind: "failed", reason: "The system keychain refused it: locked" } },
        { forge: "gitlab", saving: { kind: "failed", reason: "other" } },
      ]),
    ).toStrictEqual({
      kind: "rejected",
      message: "The token for Bitbucket could not be saved. The system keychain refused it: locked",
      field: { owner: "bitbucket", name: "token" },
    })
  })
})
