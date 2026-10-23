import type { Migration } from "@/procedures/run-migrations/utils/migration"
import { DISPLAY_RESET_MIGRATION } from "./display-reset"

export const MIGRATIONS: readonly Migration[] = [DISPLAY_RESET_MIGRATION]
