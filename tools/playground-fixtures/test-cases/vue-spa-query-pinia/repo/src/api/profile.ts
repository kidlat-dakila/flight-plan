import { request } from "@/api/client"
import type { Profile } from "@/views/account/components/profile-schema"

export const fetchProfile = async (): Promise<Profile> => {
  return await request<Profile>("/profile")
}

export const updateProfile = async (profile: Profile): Promise<Profile> => {
  return await request<Profile>("/profile", { method: "PUT", body: JSON.stringify(profile) })
}
