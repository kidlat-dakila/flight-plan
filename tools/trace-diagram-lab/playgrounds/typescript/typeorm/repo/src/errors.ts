export class NotFoundError extends Error {
  constructor(
    readonly resource: string,
    readonly resourceId: number,
  ) {
    super(`${resource} ${resourceId} not found`)
  }
}
