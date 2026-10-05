import { z } from "zod"

export const permissionHookInputSchema = z.looseObject({
  session_id: z.string().min(1),
  tool_name: z.string().min(1),
  tool_input: z.unknown().optional(),
})

export const permissionHookOutputSchema = z.strictObject({
  hookSpecificOutput: z
    .strictObject({
      hookEventName: z.literal("PermissionRequest"),
      decision: z.strictObject({ behavior: z.enum(["allow", "deny"]), message: z.string().optional() }),
    })
    .optional(),
})

export type PermissionHookInput = z.infer<typeof permissionHookInputSchema>
export type PermissionHookOutput = z.infer<typeof permissionHookOutputSchema>
