import type { SubmitEvent } from "react"

export const submitHandlerOf = (submit: () => void) => (event: SubmitEvent<HTMLFormElement>): void => {
  event.preventDefault()
  submit()
}
