import { useStore } from "zustand"
import { createStore, type StoreApi } from "zustand/vanilla"
import { INSTALL_GUIDE } from "@/procedures/get-published-review/utils/install-guide"
import UnavailableFeatureDialog from "@/published/unavailable-feature-dialog"

interface NoticeState {
  readonly isOpen: boolean
}

export type NoticeStore = StoreApi<NoticeState>

const DEMO_NOTICE = {
  title: "Thanks for checking out Flight Plan!",
  description: "This is a demo page to test-drive Flight Plan on a sample pull request. It runs in your browser, so the comments, reviews and reviewed marks you make stay on this page and are gone when you reload it.",
  closeLabel: "Keep exploring",
  install: INSTALL_GUIDE,
} as const

export const createNoticeStore = (isOpenAtStart: boolean): NoticeStore => createStore<NoticeState>(() => ({ isOpen: isOpenAtStart }))

export const openNotice = (store: NoticeStore): void => {
  store.setState({ isOpen: true })
}

const closeNotice = (store: NoticeStore): void => {
  store.setState({ isOpen: false })
}

export const DemoNotice = ({ store }: { readonly store: NoticeStore }) => {
  const isOpen = useStore(store, (state) => state.isOpen)
  const close = (): void => {
    closeNotice(store)
  }
  return isOpen ? <UnavailableFeatureDialog {...DEMO_NOTICE} onClose={close} /> : null
}
