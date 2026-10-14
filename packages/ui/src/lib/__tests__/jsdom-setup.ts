const ignoreElement = (): undefined => undefined

class ResizeObserverFake {
  readonly observe = ignoreElement
  readonly unobserve = ignoreElement
  readonly disconnect = ignoreElement
}

Reflect.defineProperty(globalThis, "ResizeObserver", { value: ResizeObserverFake, configurable: true, writable: true })
Reflect.defineProperty(Element.prototype, "scrollIntoView", { value: ignoreElement, configurable: true, writable: true })
Reflect.defineProperty(Element.prototype, "scrollTo", { value: ignoreElement, configurable: true, writable: true })
