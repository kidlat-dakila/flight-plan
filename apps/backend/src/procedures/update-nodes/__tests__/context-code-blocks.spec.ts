import { completeArtifact } from "@/procedures/complete-artifact"
import { getInstructions } from "@/procedures/get-instructions"
import { shippedConfigurationOf } from "@/procedures/list-configurations/utils/configuration"
import { readArtifact } from "@/procedures/read-artifact"
import { CONTEXT_ARTIFACT, createArtifactContext, DRAFT_ARTIFACT, KEY, messageOf, SEGMENT_KEY, SUBTOTAL_BLOCK_ID, SUBTOTAL_PATH } from "@/procedures/read-artifact/utils/__tests__/artifact-fixture"
import { requiredContextKindsOf, requiresContextCodeBlocks, withContextRequirement } from "@/procedures/read-artifact/utils/context-code-blocks"
import { tallyNodes, unwrittenWork } from "@/procedures/read-artifact/utils/unwritten-work"
import { readNodes } from "@/procedures/read-nodes"
import { planRebuild } from "@/procedures/rebuild-review/utils/plan-rebuild"
import { startingArtifactOf } from "@/procedures/request-review/utils/starting-artifact"
import { updateNodes } from "@/procedures/update-nodes"
import { ALL_SECTIONS_ON } from "@flightplan/configurations"

const DESCRIPTION = "`subtotal(cart)` is a utility function that adds the lines of a cart. It is used in [`lineTotal()`](code:src/cart/subtotal.ts#lineTotal)."
const UNREQUIRED_ARTIFACT = withContextRequirement(CONTEXT_ARTIFACT, [])
const REQUEST = { configurationId: "onboardee", preset: "onboardee", order: "foundations-first", customOrder: null, writer: { kind: "manual" }, requestedAt: new Date("2026-10-01T12:00:00.000Z") } as const

const descriptionOf = async (context: Awaited<ReturnType<typeof createArtifactContext>>): Promise<string | null | undefined> =>
  (await context.reviewStore.findArtifact(KEY))?.contextCodeBlocks[0].description

describe("the context code blocks of an artifact", () => {
  it("count a required block with no description as unwritten work of no segment, and as a part to write", () => {
    const owed = unwrittenWork(CONTEXT_ARTIFACT, ALL_SECTIONS_ON).filter((one) => one.target === "context-code-block")

    expect(owed).toMatchObject([{ id: SUBTOTAL_BLOCK_ID, segmentId: null, needs: "context-description" }])
    expect(owed[0].message).toContain(SUBTOTAL_BLOCK_ID)
    expect(tallyNodes(CONTEXT_ARTIFACT, ALL_SECTIONS_ON).incomplete).toBe(tallyNodes(DRAFT_ARTIFACT, ALL_SECTIONS_ON).incomplete + 1)
  })

  it("ask nothing for a block the configuration does not require", () => {
    expect(unwrittenWork(UNREQUIRED_ARTIFACT, ALL_SECTIONS_ON)).toStrictEqual(unwrittenWork(DRAFT_ARTIFACT, ALL_SECTIONS_ON))
    expect(tallyNodes(UNREQUIRED_ARTIFACT, ALL_SECTIONS_ON)).toStrictEqual(tallyNodes(DRAFT_ARTIFACT, ALL_SECTIONS_ON))
  })

  it("take the requirement of the configuration the review is requested with", () => {
    const required = startingArtifactOf(UNREQUIRED_ARTIFACT, REQUEST.writer, { sections: ALL_SECTIONS_ON, requiredContextKinds: ["codebase"] })

    expect(requiresContextCodeBlocks(required)).toBe(true)
    expect(requiresContextCodeBlocks(startingArtifactOf(CONTEXT_ARTIFACT, REQUEST.writer, { sections: ALL_SECTIONS_ON, requiredContextKinds: ["library"] }))).toBe(false)
  })
})

describe("a library and a name of the language among the context code blocks", () => {
  const useState = { isRequired: false, kind: "library", codeBlock: null, specifier: "react", name: "useState", description: null } as const
  const promise = { isRequired: false, kind: "language", codeBlock: null, specifier: null, name: "Promise", description: null } as const
  const mixed = { ...CONTEXT_ARTIFACT, contextCodeBlocks: [...CONTEXT_ARTIFACT.contextCodeBlocks, useState, promise] }

  it("are required only where the configuration requires their kind", () => {
    const requiredWith = (kinds: Parameters<typeof withContextRequirement>[1]): boolean[] =>
      withContextRequirement(mixed, kinds).contextCodeBlocks.map((listed) => listed.isRequired)

    expect(requiredWith(["codebase"])).toStrictEqual([true, false, false])
    expect(requiredWith(["codebase", "library", "language"])).toStrictEqual([true, true, true])
    expect(requiredWith([])).toStrictEqual([false, false, false])
  })

  it("keep the kinds an artifact requires, and what is written by name, over an update", () => {
    const required = withContextRequirement(mixed, ["codebase", "library", "language"])
    const written = { ...required, contextCodeBlocks: required.contextCodeBlocks.map((listed) => ({ ...listed, description: `About ${listed.name ?? "subtotal"}.` })) }
    const updated = planRebuild({ mode: "update", previous: written, previousRequest: REQUEST, rebuilt: withContextRequirement(mixed, []), request: REQUEST, configuration: shippedConfigurationOf("onboardee") })

    expect(requiredContextKindsOf(updated)).toStrictEqual(["codebase", "library", "language"])
    expect(updated.contextCodeBlocks.map((listed) => listed.description)).toStrictEqual(["About subtotal.", "About useState.", "About Promise."])
  })

  it("are handed out and written by the name, with no code for a name of the language", async () => {
    const context = await createArtifactContext(withContextRequirement(mixed, ["codebase", "library", "language"]), "unfamiliar-territory")

    await expect(readNodes({ ...KEY, ids: ["library:react#useState", "language:Promise"] }, context)).resolves.toMatchObject({
      items: [
        { kind: "context-code-block", id: "library:react#useState", needs: ["context-description"], file: null, code: null, node: { kind: "library", name: "useState", library: "react" } },
        { kind: "context-code-block", id: "language:Promise", needs: ["context-description"], file: null, code: null, node: { kind: "language", name: "Promise", library: null } },
      ],
    })
    await expect(updateNodes({ ...SEGMENT_KEY, contextCodeBlocks: [{ id: "language:Promise", description: "`Promise` is a value that arrives later." }] }, context)).resolves.toMatchObject({ kind: "written" })
    await expect(context.reviewStore.findArtifact(KEY)).resolves.toMatchObject({ contextCodeBlocks: [{}, { description: null }, { description: "`Promise` is a value that arrives later." }] })
  })

  it("are refused a description while only the code of the repository is required", async () => {
    const context = await createArtifactContext(withContextRequirement(mixed, ["codebase"]), "onboardee")
    const refusal = messageOf(await updateNodes({ ...SEGMENT_KEY, contextCodeBlocks: [{ id: "library:react#useState", description: "`useState` is a hook." }] }, context))

    expect(refusal).toContain("asks for no description of `library:react#useState`")
  })
})

describe("readNodes", () => {
  it("hands out a context code block with its code, its kind and the code that uses it", async () => {
    const context = await createArtifactContext(CONTEXT_ARTIFACT, "onboardee")

    const reading = await readNodes({ ...KEY, unfilled: true, needs: ["context-description"] }, context)

    expect(reading).toMatchObject({
      kind: "unfilled",
      total: 1,
      items: [{
        kind: "context-code-block",
        id: SUBTOTAL_BLOCK_ID,
        segmentId: null,
        file: SUBTOTAL_PATH,
        needs: ["context-description"],
        node: { kind: "codebase", name: "subtotal", type: "function", isRequired: true, description: null, usedBy: [], usedByCount: 0 },
      }],
    })
    expect(reading.kind === "unfilled" ? reading.items[0].code?.text : "").toContain("export const subtotal")
  })
})

describe("updateNodes", () => {
  it("writes the description of a context code block, by the id of its block", async () => {
    const context = await createArtifactContext(CONTEXT_ARTIFACT, "onboardee")

    const writing = await updateNodes({ ...SEGMENT_KEY, contextCodeBlocks: [{ id: SUBTOTAL_BLOCK_ID, description: DESCRIPTION }] }, context)

    expect(writing).toMatchObject({ kind: "written", note: "Wrote 1 entry." })
    await expect(descriptionOf(context)).resolves.toBe(DESCRIPTION)
    await expect(readArtifact({ ...KEY, section: "overview" }, context)).resolves.toMatchObject({
      content: { contextCodeBlocks: [{ id: SUBTOTAL_BLOCK_ID, kind: "codebase", path: SUBTOTAL_PATH, name: "subtotal", isRequired: true, isDescriptionWritten: true }] },
    })
  })

  it("refuses a block the artifact does not list, a code link that does not resolve, and a block named twice", async () => {
    const context = await createArtifactContext(CONTEXT_ARTIFACT, "onboardee")
    const refusalOf = async (contextCodeBlocks: { id: string, description: string }[]): Promise<string> =>
      messageOf(await updateNodes({ ...SEGMENT_KEY, contextCodeBlocks }, context))

    await expect(refusalOf([{ id: "src/gone.ts#function@1:1", description: DESCRIPTION }])).resolves.toContain("has no context code block `src/gone.ts#function@1:1`")
    await expect(refusalOf([{ id: SUBTOTAL_BLOCK_ID, description: "It is used in [`gone()`](code:src/gone.ts#gone)." }])).resolves.toContain("does not resolve")
    await expect(refusalOf([{ id: SUBTOTAL_BLOCK_ID, description: DESCRIPTION }, { id: SUBTOTAL_BLOCK_ID, description: DESCRIPTION }])).resolves.toContain("more than once")
    await expect(descriptionOf(context)).resolves.toBeNull()
  })

  it("refuses a description where the configuration asks for none, and says so", async () => {
    const context = await createArtifactContext(UNREQUIRED_ARTIFACT)

    await expect(updateNodes({ ...SEGMENT_KEY, contextCodeBlocks: [{ id: SUBTOTAL_BLOCK_ID, description: DESCRIPTION }] }, context)).resolves.toMatchObject({
      kind: "rejected",
      message: "The configuration of this review asks for no description of a context code block. Do not write one, and do not ask the reviewer about it. Nothing was written.",
    })
  })
})

describe("getInstructions", () => {
  it("lists the fields of the context code blocks only where the configuration requires them", async () => {
    const pathsFor = async (artifact: typeof CONTEXT_ARTIFACT): Promise<string[]> => {
      const result = await getInstructions(KEY, await createArtifactContext(artifact, "onboardee"))
      return result.kind === "indexed" ? result.index.fields.map((field) => field.path).filter((path) => path.startsWith("contextCodeBlocks")) : []
    }

    await expect(pathsFor(CONTEXT_ARTIFACT)).resolves.toStrictEqual(["contextCodeBlocks", "contextCodeBlocks.description"])
    await expect(pathsFor(UNREQUIRED_ARTIFACT)).resolves.toStrictEqual([])
  })

  it("refuses to say how to write a description where the configuration asks for none", async () => {
    const context = await createArtifactContext(UNREQUIRED_ARTIFACT)

    const refusal = messageOf(await getInstructions({ ...KEY, fields: ["contextCodeBlocks.description"] }, context))

    expect(refusal).toContain("asks for no description of a context code block")
  })
})

describe("completeArtifact", () => {
  it("does not finish an artifact while a required context code block has no description", async () => {
    const context = await createArtifactContext(CONTEXT_ARTIFACT, "onboardee")

    const completion = await completeArtifact({ ...KEY, limit: 50 }, context)

    expect(completion.kind === "unfinished" ? completion.missing.map((one) => one.needs) : []).toContain("context-description")
  })
})

describe("planRebuild", () => {
  const written = { ...CONTEXT_ARTIFACT, contextCodeBlocks: [{ ...CONTEXT_ARTIFACT.contextCodeBlocks[0], description: DESCRIPTION }] }

  it("keeps the requirement and a description over an update, where the block's code is the same", () => {
    const updated = planRebuild({ mode: "update", previous: written, previousRequest: REQUEST, rebuilt: UNREQUIRED_ARTIFACT, request: REQUEST, configuration: shippedConfigurationOf("onboardee") })

    expect(updated.contextCodeBlocks).toMatchObject([{ isRequired: true, description: DESCRIPTION }])
  })

  it("takes the requirement of the configuration again on a regenerate, and drops what was written", () => {
    const regenerated = planRebuild({ mode: "regenerate", previous: written, previousRequest: REQUEST, rebuilt: UNREQUIRED_ARTIFACT, request: { ...REQUEST, configurationId: "standard", preset: "standard" }, configuration: shippedConfigurationOf("standard") })

    expect(regenerated.contextCodeBlocks).toMatchObject([{ isRequired: false, description: null }])
  })
})
