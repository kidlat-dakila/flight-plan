import { fileURLToPath } from "node:url"
import { setInstructionRoot } from "./src/lib/schemas/shippedInstructions"

// Tests read the instruction trees where the repository keeps them, the way
// every entry point names its own root before anything reads a field.
setInstructionRoot(fileURLToPath(new URL("./src/lib/schemas/", import.meta.url)))
