import {
  AT_REPOSITORIES,
  CHECKOUT_WEB,
  createSetupContext,
  DEV,
  LENA,
  READY_TO_FINISH,
} from "@/procedures/get-setup/utils/__tests__/setup-fixture"
import { setSelfAuthor } from "@/procedures/set-self-author"

const WITH_CHECKOUT_WEB = { ...AT_REPOSITORIES, repositories: [CHECKOUT_WEB] }

describe("setSelfAuthor", () => {
  it("records which author is the user", async () => {
    const context = createSetupContext(WITH_CHECKOUT_WEB)

    await setSelfAuthor({ repositoryName: "checkout-web", authorId: DEV.id }, context)

    await expect(context.setupStore.read()).resolves.toMatchObject({ repositories: [{ selfAuthor: DEV }] })
  })

  it("takes the user out of the tracked authors", async () => {
    const context = createSetupContext(READY_TO_FINISH)

    await setSelfAuthor({ repositoryName: "checkout-web", authorId: LENA.id }, context)

    await expect(context.setupStore.read()).resolves.toMatchObject({
      repositories: [{ selfAuthor: LENA, trackedAuthors: [] }],
    })
  })

  it("clears the choice and keeps the tracked authors", async () => {
    const context = createSetupContext(READY_TO_FINISH)

    await setSelfAuthor({ repositoryName: "checkout-web", authorId: null }, context)

    await expect(context.setupStore.read()).resolves.toMatchObject({
      repositories: [{ selfAuthor: null, trackedAuthors: [LENA] }],
    })
  })

  it("has no result for an unknown author or repository", async () => {
    const context = createSetupContext(WITH_CHECKOUT_WEB)

    await expect(setSelfAuthor({ repositoryName: "checkout-web", authorId: "nobody" }, context)).resolves.toBeNull()
    await expect(setSelfAuthor({ repositoryName: "storefront", authorId: DEV.id }, context)).resolves.toBeNull()
    await expect(context.setupStore.read()).resolves.toStrictEqual(WITH_CHECKOUT_WEB)
  })
})
