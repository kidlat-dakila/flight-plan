import { configure } from "@testing-library/react"

const ASYNC_QUERY_TIMEOUT_MS = 5000

const ignoreElement = (): undefined => undefined

class ResizeObserverFake {
  readonly observe = ignoreElement
  readonly unobserve = ignoreElement
  readonly disconnect = ignoreElement
}

Reflect.defineProperty(globalThis, "ResizeObserver", { value: ResizeObserverFake, configurable: true, writable: true })

configure({ asyncUtilTimeout: ASYNC_QUERY_TIMEOUT_MS })
