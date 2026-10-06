import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { fetchProfile, updateProfile } from "@/api/profile"

const PROFILE_QUERY_KEY = ["profile"] as const

export function useProfile() {
  return useQuery({ queryKey: PROFILE_QUERY_KEY, queryFn: fetchProfile })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateProfile,
    onSuccess: (profile) => {
      queryClient.setQueryData(PROFILE_QUERY_KEY, profile)
    },
  })
}
