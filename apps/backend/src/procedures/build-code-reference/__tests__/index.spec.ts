import { buildCodeReference } from "@/procedures/build-code-reference"
import { createMockProcedureContext } from "@/procedures/context"

const REQUEST = { repositoryName: "storefront", targetId: "pr-405", path: "src/cart/subtotal.ts", lineStart: 6, lineEnd: 7 }

const createContext = () => createMockProcedureContext(new Date("2026-10-01T12:00:00.000Z"))

describe("buildCodeReference", () => {
  it("references the lines at the commit the artifact was written against", async () => {
    await expect(buildCodeReference(REQUEST, createContext())).resolves.toStrictEqual({
      reference: "storefront@c81e220:src/cart/subtotal.ts#L6-7",
    })
  })

  it("reports nothing for a file the artifact does not cite, or a review without an artifact", async () => {
    await expect(buildCodeReference({ ...REQUEST, path: "src/gone.ts" }, createContext())).resolves.toBeNull()
    await expect(buildCodeReference({ ...REQUEST, targetId: "pr-416" }, createContext())).resolves.toBeNull()
  })
})
