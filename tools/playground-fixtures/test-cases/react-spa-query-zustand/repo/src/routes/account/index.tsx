import { useProfile } from "@/hooks/use-profile"
import { ProfileForm } from "./components/ProfileForm"

export function AccountPage() {
  const { data: profile, isPending } = useProfile()
  if (isPending || profile === undefined) return <p>Loading your account…</p>
  return (
    <section>
      <h1>Your account</h1>
      <ProfileForm profile={profile} />
    </section>
  )
}
