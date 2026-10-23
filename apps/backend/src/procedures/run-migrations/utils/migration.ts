import type { ProcedureContext } from "@/procedures/context"
import type { InitRecord } from "./schemas"

export interface Migration {
  readonly version: string
  readonly migrate: (context: ProcedureContext) => Promise<void>
}

export interface InitFile {
  readonly read: () => Promise<InitRecord | null>
  readonly write: (record: InitRecord) => Promise<void>
}
