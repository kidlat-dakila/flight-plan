import { traceUsages, type AttributeSite, type BaseASTGraphFile, type FileUsage } from "@/ast-graph"
import { findComponent } from "./resolve-props"
import { calleeNameOf } from "./usage-role"

const READING_CALLEES: ReadonlySet<string> = new Set(["useContext", "use"])

const isReadingContext = ({ file, usage }: FileUsage): boolean => {
  const narrowest = file.listSyntaxSitesAt(usage.range).find((site) => site.kind === "argument")
  return narrowest?.kind === "argument" && READING_CALLEES.has(calleeNameOf(narrowest))
}

export const listContextReaders = (files: readonly BaseASTGraphFile[], holder: BaseASTGraphFile, { elementName }: AttributeSite): FileUsage[] => {
  const context = elementName === null ? null : findComponent(files, holder, elementName)
  if (context === null) return []
  return traceUsages(files, { file: context.file, encapsulation: context.root }).filter(isReadingContext)
}
