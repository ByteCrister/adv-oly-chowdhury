"use client";

import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import axios from "axios";
import { MediaFilterParams, MediaPaginationResponse } from "@/types/media.types";

export const mediaKeys = {
  all: ["media"] as const,
  lists: () => [...mediaKeys.all, "list"] as const,
  list: (filters: MediaFilterParams) => [...mediaKeys.lists(), filters] as const,
  details: () => [...mediaKeys.all, "detail"] as const,
  detail: (id: string) => [...mediaKeys.details(), id] as const,
};

export async function fetchMediaList(
  filters: MediaFilterParams = {}
): Promise<MediaPaginationResponse> {
  const params = new URLSearchParams();

  if (filters.search) params.append("search", filters.search);
  if (filters.assetType) params.append("assetType", filters.assetType);
  if (filters.ownerType) params.append("ownerType", filters.ownerType);
  if (filters.ownerId) params.append("ownerId", filters.ownerId);
  if (filters.purpose) params.append("purpose", filters.purpose);
  if (filters.page) params.append("page", String(filters.page));
  if (filters.limit) params.append("limit", String(filters.limit));
  if (filters.sort) params.append("sort", filters.sort);
  if (filters.includeDeleted) params.append("includeDeleted", "true");

  const response = await axios.get<MediaPaginationResponse>(
    `/api/v1/media?${params.toString()}`
  );
  return response.data;
}

export function useMediaList(
  filters: MediaFilterParams = {},
  options?: Omit<
    UseQueryOptions<MediaPaginationResponse, Error, MediaPaginationResponse, ReturnType<typeof mediaKeys.list>>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: mediaKeys.list(filters),
    queryFn: () => fetchMediaList(filters),
    ...options,
  });
}
