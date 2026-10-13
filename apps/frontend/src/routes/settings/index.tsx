import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/settings/")({
  beforeLoad: () => {
    redirect({ to: "/settings/agents", throw: true })
  },
})
