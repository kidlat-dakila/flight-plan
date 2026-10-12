const ignoreElement = (): undefined => undefined

class ResizeObserverFake {
  readonly observe = ignoreElement
  readonly unobserve = ignoreElement
  readonly disconnect = ignoreElement
}

Reflect.defineProperty(globalThis, "ResizeObserver", { value: ResizeObserverFake, configurable: true, writable: true })
