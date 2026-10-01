import {
  AT_REPOSITORIES,
  CHECKOUT_WEB,
  createSetupContext,
  DEV,
  LENA,
  READY_TO_FINISH,
} from "@/procedures/get-setup/utils/__tests__/setup-fixture"
import { setAuthorTracking } from "@/procedures/set-author-tracking"

const WITH_CHECKOUT_WEB = { ...AT_REPOSITORIES, repositories: [{ ...CHECKOUT_WEB, selfAuthor: DEV }] }

describe("setAuthorTracking", () => {
  it("tracks an author the repository knows", async () => {
    const context = createSetupContext(WITH_CHECKOUT_WEB)

    await setAuthorTracking({ repositoryName: "checkout-web", authorId: LENA.id, isTracked: true }, context)

    await expect(context.setupStore.read()).resolves.toStrictEqual(READY_TO_FINISH)
  })

  it("stops tracking an author", async () => {
    const context = createSetupContext(READY_TO_FINISH)

    await setAuthorTracking({ repositoryName: "checkout-web", authorId: LENA.id, isTracked: false }, context)

    await expect(context.setupStore.read()).resolves.toStrictEqual(WITH_CHECKOUT_WEB)
  })

  it("has no result for an unknown author or repository", async () => {
    const context = createSetupContext(WITH_CHECKOUT_WEB)

    await expect(
      setAuthorTracking({ repositoryName: "checkout-web", authorId: "nobody@acme.example", isTracked: true }, context),
    ).resolves.toBeNull()
    await expect(
      setAuthorTracking({ repositoryName: "storefront", authorId: LENA.id, isTracked: true }, context),
    ).resolves.toBeNull()
    await expect(context.setupStore.read()).resolves.toStrictEqual(WITH_CHECKOUT_WEB)
  })
})
