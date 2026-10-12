import { renderHook } from "@testing-library/react"
import { requestNotificationPermission } from "@/notification-permission"
import { useCompletionNotification } from "@/routes/pr-reviews/$repoName/-hooks/use-completion-notification"

const COMPLETION = { title: "Flight Plan Review ready", body: "Count held units is ready to read." }
const REVIEW_ID = "storefront/pr-412"

interface HookProps {
  readonly reviewId: string
  readonly isBeingWritten: boolean
  readonly completion: typeof COMPLETION | null
}

const stubNotifications = (permission: NotificationPermission) => {
  const close = vi.fn()
  const addEventListener = vi.fn<(type: string, listener: () => void) => void>()
  const construct = vi.fn<(title: string, options: NotificationOptions) => void>()
  const requestPermission = vi.fn(async () => await Promise.resolve(permission))

  class FakeNotification {
    public static readonly permission = permission
    public static readonly requestPermission = requestPermission
    public readonly close = close
    public readonly addEventListener = addEventListener

    public constructor(title: string, options: NotificationOptions) {
      construct(title, options)
    }
  }

  vi.stubGlobal("Notification", FakeNotification)
  return { construct, close, addEventListener, requestPermission }
}

const renderNotifier = (announce: (message: string) => void, initialProps: HookProps) =>
  renderHook(
    (props: HookProps) => {
      useCompletionNotification(props.reviewId, props.isBeingWritten, props.completion, announce)
    },
    { initialProps },
  )

describe("useCompletionNotification", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("raises one notification when a review it saw being written is complete, and focuses the page on a click", () => {
    const notifications = stubNotifications("granted")
    const announce = vi.fn()
    const focus = vi.spyOn(window, "focus").mockImplementation(() => undefined)
    const { rerender } = renderNotifier(announce, { reviewId: REVIEW_ID, isBeingWritten: true, completion: null })

    rerender({ reviewId: REVIEW_ID, isBeingWritten: false, completion: COMPLETION })
    rerender({ reviewId: REVIEW_ID, isBeingWritten: false, completion: COMPLETION })

    expect(announce.mock.calls).toStrictEqual([["Flight Plan Review ready"]])
    expect(notifications.construct.mock.calls).toStrictEqual([
      ["Flight Plan Review ready", { body: "Count held units is ready to read.", tag: REVIEW_ID }],
    ])

    notifications.addEventListener.mock.calls[0]?.[1]()

    expect(notifications.addEventListener.mock.calls[0]?.[0]).toBe("click")
    expect(focus).toHaveBeenCalledTimes(1)
    expect(notifications.close).toHaveBeenCalledTimes(1)
  })

  it("raises nothing for a review that was already complete when the page opened", () => {
    const notifications = stubNotifications("granted")
    const announce = vi.fn()

    renderNotifier(announce, { reviewId: REVIEW_ID, isBeingWritten: false, completion: COMPLETION })

    expect(announce).not.toHaveBeenCalled()
    expect(notifications.construct).not.toHaveBeenCalled()
  })

  it("raises nothing for another review than the one it saw being written", () => {
    const notifications = stubNotifications("granted")
    const { rerender } = renderNotifier(vi.fn(), { reviewId: REVIEW_ID, isBeingWritten: true, completion: null })

    rerender({ reviewId: "storefront/pr-405", isBeingWritten: false, completion: COMPLETION })

    expect(notifications.construct).not.toHaveBeenCalled()
  })

  it("announces on the page alone when the browser may not notify", () => {
    const notifications = stubNotifications("denied")
    const announce = vi.fn()
    const { rerender } = renderNotifier(announce, { reviewId: REVIEW_ID, isBeingWritten: true, completion: null })

    rerender({ reviewId: REVIEW_ID, isBeingWritten: false, completion: COMPLETION })

    expect(announce).toHaveBeenCalledTimes(1)
    expect(notifications.construct).not.toHaveBeenCalled()
  })
})

describe("requestNotificationPermission", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("asks while the reviewer has not answered, and not once they have", () => {
    const unanswered = stubNotifications("default")
    requestNotificationPermission()
    const denied = stubNotifications("denied")
    requestNotificationPermission()

    expect(unanswered.requestPermission).toHaveBeenCalledTimes(1)
    expect(denied.requestPermission).not.toHaveBeenCalled()
  })
})
