import { formatGreeting } from "./utils/format-greeting"
import type { GreetInput } from "./utils/schemas"

export const greet = (input: GreetInput): { message: string } => ({ message: formatGreeting(input.name) })
