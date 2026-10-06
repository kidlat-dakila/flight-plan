import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Button, Input } from "@/components/ui"
import { useUpdateProfile } from "@/hooks/use-profile"
import { profileSchema, type Profile } from "./profile-schema"

export function ProfileForm({ profile }: { profile: Profile }) {
  const { mutate: saveProfile, isPending } = useUpdateProfile()
  const { register, handleSubmit, formState } = useForm<Profile>({
    resolver: zodResolver(profileSchema),
    defaultValues: profile,
  })

  function onSubmit(values: Profile) {
    saveProfile(values)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Input aria-label="Name" {...register("name")} />
      {formState.errors.name && <p>{formState.errors.name.message}</p>}
      <Input aria-label="Email" {...register("email")} />
      {formState.errors.email && <p>{formState.errors.email.message}</p>}
      <Button type="submit" disabled={isPending}>
        Save
      </Button>
    </form>
  )
}
