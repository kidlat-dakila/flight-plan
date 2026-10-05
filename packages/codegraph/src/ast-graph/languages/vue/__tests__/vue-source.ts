import { sourceOf } from "@/ast-graph/languages/__tests__/script-files"

export const setupComponent = (script: readonly string[], template: readonly string[]): string =>
  sourceOf("<script setup lang=\"ts\">", ...script, "</script>", "<template>", ...template, "</template>")

export const optionsComponent = (script: readonly string[], template: readonly string[]): string =>
  sourceOf("<script>", ...script, "</script>", "<template>", ...template, "</template>")
