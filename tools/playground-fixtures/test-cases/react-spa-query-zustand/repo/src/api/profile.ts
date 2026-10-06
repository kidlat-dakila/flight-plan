import { request } from "@/api/client"
import type { Profile } from "@/routes/account/components/profile-schema"

export function fetchProfile(): Promise<Profile> {
  return request<Profile>("/profile")
}

export function updateProfile(profile: Profile): Promise<Profile> {
  return request<Profile>("/profile", { method: "PUT", body: JSON.stringify(profile) })
}
