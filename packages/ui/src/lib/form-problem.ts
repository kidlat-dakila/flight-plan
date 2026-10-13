export interface FormProblem {
  readonly message: string
  readonly field: { readonly owner: string, readonly name: string } | null
}
