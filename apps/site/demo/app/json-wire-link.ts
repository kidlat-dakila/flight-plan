import type { TRPCLink } from "@trpc/client"
import type { AnyRouter } from "@trpc/server"
import { observable } from "@trpc/server/observable"

const overTheWire = <T>(value: T): T =>
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- a JSON copy has the shape of the value it copies
  value === undefined ? value : JSON.parse(JSON.stringify(value)) as T

export const jsonWireLink = <TRouter extends AnyRouter>(): TRPCLink<TRouter> => () => ({ next, op }) =>
  observable((observer) =>
    next({ ...op, input: overTheWire(op.input) }).subscribe({
      next: (envelope) => {
        observer.next({ ...envelope, result: overTheWire(envelope.result) })
      },
      error: (error) => {
        observer.error(error)
      },
      complete: () => {
        observer.complete()
      },
    }),
  )
