import { describe, expect, test } from "vitest"
import { DEFAULT_SECTIONS, defaultRead, descriptionRead, TOGGLEABLE_BODIES } from "../defaultProfile"
import { ArtifactSchema, configurations } from "../preferences"
import { walkConfigurations } from "../walkConfigurations"

describe("descriptionRead", () => {
  test("returns embedded content for a known field description", () => {
    expect(descriptionRead("meta/meta.md")).toBeTypeOf("string")
  })

  test("resolves the fieldDescription of every field in the schema", () => {
    for (const { configuration } of walkConfigurations(ArtifactSchema, configurations)) {
      expect(descriptionRead(configuration.fieldDescription)).toBeTypeOf("string")
    }
  })

  test("returns undefined for an unknown path", () => {
    expect(descriptionRead("nope/nope.md")).toBeUndefined()
  })
})

describe("defaultRead", () => {
  test("resolves the defaultInstruction of every editable field", () => {
    for (const { configuration } of walkConfigurations(ArtifactSchema, configurations)) {
      if (configuration.configurationType !== "editable") continue
      expect(defaultRead(configuration.defaultInstruction)).toBeTypeOf("string")
    }
  })

  test("resolves every option of every editable enum field", () => {
    for (const { configuration } of walkConfigurations(ArtifactSchema, configurations)) {
      if (configuration.configurationType !== "editable") continue
      for (const option of Object.values(configuration.values ?? {})) {
        expect(defaultRead(option), option).toBeTypeOf("string")
      }
    }
  })

  test("returns undefined for an unknown path", () => {
    expect(defaultRead("nope/nope.md")).toBeUndefined()
  })
})

describe("DEFAULT_SECTIONS", () => {
  test("has the three toggleable bodies, all on", () => {
    expect(DEFAULT_SECTIONS).toEqual({ diagram: true, blast: true, codeWalkthrough: true })
  })

  test("TOGGLEABLE_BODIES lists exactly those three", () => {
    expect([...TOGGLEABLE_BODIES].sort()).toEqual(["blast", "codeWalkthrough", "diagram"])
  })
})
