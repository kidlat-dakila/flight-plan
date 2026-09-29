import type { z } from "zod"
import {
  ArtifactSchema,
  configurations,
  documentFormat,
  staticWritingStyle,
  writingStyle,
} from "./preferences"
import type { FieldConfiguration } from "./preferences"

/** One configuration found in the schema, at its path from the root. */
export type ConfigEntry = {
  /** The field's key path from the root object. */
  path: string[]
  configuration: FieldConfiguration
  /** The schema node, for building an example. Absent on non-field entries. */
  schema?: z.ZodType
}

/**
 * Walk a Zod schema and collect every field's registered `FieldConfiguration`,
 * in schema-definition order, each with its key path from the root.
 */
export function walkConfigurations(
  schema: z.ZodType,
  registry: z.core.$ZodRegistry<FieldConfiguration>,
): ConfigEntry[] {
  const entries: ConfigEntry[] = []
  // Self-recursive (`z.lazy`) nodes are emitted once, at first encounter, so a
  // node whose children are itself does not loop forever.
  const seenLazy = new Set<z.ZodType>()

  const visit = (node: z.ZodType, path: string[]): void => {
    const config = registry.get(node)
    if (config) entries.push({ path, configuration: config, schema: node })

    const def = (node as unknown as { def: { type: string } & Record<string, unknown> }).def
    switch (def.type) {
      case "object": {
        const shape = (node as unknown as { shape: Record<string, z.ZodType> }).shape
        for (const key of Object.keys(shape)) {
          const child = shape[key]
          if (child) visit(child, [...path, key])
        }
        return
      }
      case "optional":
      case "nullable":
      case "default":
        visit(def.innerType as z.ZodType, path)
        return
      case "array":
        visit(def.element as z.ZodType, path)
        return
      case "union":
        for (const option of def.options as z.ZodType[]) visit(option, path)
        return
      case "lazy": {
        if (seenLazy.has(node)) return
        seenLazy.add(node)
        visit((def.getter as () => z.ZodType)(), path)
        return
      }
    }
  }

  visit(schema, [])
  return entries
}

/**
 * The full configuration list for the settings screen: the overall
 * `writingStyle` instruction first, then every `ArtifactSchema` field in
 * schema-definition order.
 */
export function listArtifactConfigurations(): ConfigEntry[] {
  return [
    { path: ["writingStyle"], configuration: writingStyle },
    { path: ["staticWritingStyle"], configuration: staticWritingStyle },
    { path: ["documentFormat"], configuration: documentFormat },
    ...walkConfigurations(ArtifactSchema, configurations),
  ]
}
