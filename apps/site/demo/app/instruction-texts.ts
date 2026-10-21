import { instructionReaderOf, instructionTextsOf } from "@flightplan/backend/instruction-texts"

const SHIPPED_INSTRUCTION_FILES = import.meta.glob<string>(
  [
    "../../../../packages/configurations/src/system-instructions/*.md",
    "../../../../packages/configurations/src/default-configurations/*/*.md",
  ],
  { query: "?raw", import: "default", eager: true },
)

export const readShippedInstructionTexts = instructionReaderOf(instructionTextsOf(SHIPPED_INSTRUCTION_FILES))
