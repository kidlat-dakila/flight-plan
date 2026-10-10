import { useMutation, useQuery } from "@tanstack/vue-query"
import { fetchProfile, updateProfile } from "@/api/profile"

export const useProfile = () => {
  return useQuery({
    queryKey: ["profile"],
    queryFn: fetchProfile,
  })
}

export const useUpdateProfile = () => {
  return useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      console.info("The profile was saved.")
    },
  })
}
