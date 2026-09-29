import type { z } from "zod"
import type { FieldConfiguration } from "./preferences"

/**
 * Build an example value for a schema node from the `exampleValue`s registered
 * on its leaves. A leaf uses its own `exampleValue` (or a type fallback); an
 * object assembles its fields, an array wraps one element, an enum takes its
 * `exampleValue` or first option, a union takes its first member. A
 * self-referential array (a node's `children`) comes out empty, so the walk
 * terminates. This is the single source of the example the MCP shows.
 */
export function buildExample(
  schema: z.ZodType,
  registry: z.core.$ZodRegistry<FieldConfiguration>,
): unknown {
  const build = (node: z.ZodType, seen: Set<z.ZodType>): unknown => {
    const def = (node as unknown as { def: { type: string } & Record<string, unknown> }).def
    const config = registry.get(node)
    const example = config?.exampleValue

    // A structural field (sources, a code fence, meta) supplies its whole shape.
    if (config?.exampleOverride !== undefined) return structuredClone(config.exampleOverride)

    // A field's own exampleValue wins, even when it sits on a wrapper
    // (`.nullable()`, `.optional()`) rather than the inner primitive. Arrays are
    // handled below, where the value becomes the single element.
    if (example !== undefined && def.type !== "array") return example

    switch (def.type) {
      case "optional":
      case "nullable":
      case "default":
        return build(def.innerType as z.ZodType, seen)
      case "lazy": {
        if (seen.has(node)) return {}
        const next = new Set(seen).add(node)
        return build((def.getter as () => z.ZodType)(), next)
      }
      case "object": {
        const shape = (node as unknown as { shape: Record<string, z.ZodType> }).shape
        const out: Record<string, unknown> = {}
        for (const key of Object.keys(shape)) {
          const child = shape[key]
          if (child) out[key] = build(child, seen)
        }
        return out
      }
      case "array": {
        // An array-of-primitive field carries its exampleValue on the array
        // itself (the element is unregistered), so use it as the one element.
        if (example !== undefined) return [example]
        const element = def.element as z.ZodType
        if (seen.has(element)) return []
        return [build(element, seen)]
      }
      case "tuple":
        return (def.items as z.ZodType[]).map((item) => build(item, seen))
      case "union":
        return build((def.options as z.ZodType[])[0] as z.ZodType, seen)
      case "string":
        return example ?? "…"
      case "number":
        return example ?? 0
      case "boolean":
        return example ?? true
      case "literal": {
        const values = def.values as unknown[] | undefined
        return example ?? (Array.isArray(values) ? values[0] : (def as { value?: unknown }).value)
      }
      case "enum": {
        const options = (node as unknown as { options?: unknown[] }).options
        return example ?? (Array.isArray(options) ? options[0] : undefined)
      }
      default:
        return example ?? null
    }
  }

  return build(schema, new Set())
}
