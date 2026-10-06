import { z } from "zod"

interface SharedConfiguration {
  readonly version: number
  readonly fieldDescription: string
  readonly exampleValue?: string | number | boolean
  readonly values?: Readonly<Record<string, string>>
}

export interface EditableConfiguration extends SharedConfiguration {
  readonly configurationType: "editable"
  readonly _ui: { readonly title: string, readonly description: string }
  readonly defaultInstruction: string
}

export interface StaticConfiguration extends SharedConfiguration {
  readonly configurationType: "static"
  readonly summary: string
}

export type FieldConfiguration = EditableConfiguration | StaticConfiguration

export const configurations = z.registry<FieldConfiguration>()

export const writingStyle: FieldConfiguration = {
  version: 0.1,
  configurationType: "editable",
  _ui: {
    title: "Writing style",
    description: "The shared voice. Fetch before writing any prose.",
  },
  fieldDescription: "writingStyle.md",
  defaultInstruction: "writingStyle.md",
}

export const codeLinks: FieldConfiguration = {
  version: 0.1,
  configurationType: "static",
  summary: "How a code link is written and what it can point at. Fetch with the voice.",
  fieldDescription: "codeLinks.md",
}

export const artifactFormat: FieldConfiguration = {
  version: 0.1,
  configurationType: "static",
  summary: "The artifact's shape, what you write, and what a write is refused for. Fetch before the first write.",
  fieldDescription: "artifactFormat.md",
}
