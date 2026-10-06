import { z } from "zod"
import { reviewArtifactSchema } from "./artifact-schema"
import { artifactFormat, codeLinks, configurations, writingStyle, type FieldConfiguration } from "./field-configuration"

const nestedNodesOf = (node: z.core.$ZodType): readonly z.core.$ZodType[] => {
  if (node instanceof z.ZodObject) return Object.values<z.core.$ZodType>(node.shape)
  if (node instanceof z.ZodArray) return [node.element]
  if (node instanceof z.ZodNullable || node instanceof z.ZodOptional || node instanceof z.ZodLazy) return [node.unwrap()]
  if (node instanceof z.ZodUnion) return node.options
  return []
}

const registeredIn = (node: z.core.$ZodType, ancestors: readonly z.core.$ZodType[]): FieldConfiguration[] => {
  if (ancestors.includes(node)) return []
  const configuration = configurations.get(node)
  return [
    ...(configuration === undefined ? [] : [configuration]),
    ...nestedNodesOf(node).flatMap((nested) => registeredIn(nested, [...ancestors, node])),
  ]
}

export const FIELD_CONFIGURATIONS: readonly FieldConfiguration[] = [
  writingStyle,
  codeLinks,
  artifactFormat,
  ...registeredIn(reviewArtifactSchema, []),
]
