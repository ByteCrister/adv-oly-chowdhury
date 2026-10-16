"use client";

import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import axios from "axios";
import { ProfileApiResponse } from "@/types/profile.ui.type";
import { PROFILE_QUERY_KEYS } from "@/const/profile.const";

export const profileKeys = PROFILE_QUERY_KEYS;

export async function fetchProfile(): Promise<ProfileApiResponse> {
  const response = await axios.get<ProfileApiResponse>("/api/v1/users/me");
  return response.data;
}

export function useProfile(
  options?: Omit<
    UseQueryOptions<ProfileApiResponse, Error, ProfileApiResponse, ReturnType<typeof profileKeys.me>>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: profileKeys.me(),
    queryFn: fetchProfile,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    ...options,
  });
}

export default useProfile;
