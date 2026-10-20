import { getAuthorForm } from "@/procedures/get-author-form"
import {
  AT_REPOSITORIES,
  createSetupContext,
  GITHUB_FORGES,
  servedByForge,
} from "@/procedures/get-setup/utils/__tests__/setup-fixture"

const FOLDER = "/Users/dev/projects/checkout-web"

describe("getAuthorForm", () => {
  it("builds the local git form while no folder is typed, whatever code host is connected", async () => {
    await expect(
      getAuthorForm({ path: "  " }, createSetupContext({ ...AT_REPOSITORIES, forges: GITHUB_FORGES })),
    ).resolves.toMatchObject({ searchPlaceholder: "Type a name or email" })
  })

  it("builds the form from the forge that serves the folder typed", async () => {
    const forgeServed = servedByForge(createSetupContext(AT_REPOSITORIES), "gh")

    await expect(getAuthorForm({ path: FOLDER }, forgeServed)).resolves.toMatchObject({ searchPlaceholder: "Type a name or username" })
  })

  it("builds the local git form for a folder that is not a repository", async () => {
    const forgeServed = servedByForge(createSetupContext(AT_REPOSITORIES), "gh")

    await expect(getAuthorForm({ path: "/Users/dev/projects/meeting-notes" }, forgeServed)).resolves.toMatchObject({
      searchPlaceholder: "Type a name or email",
    })
  })
})
