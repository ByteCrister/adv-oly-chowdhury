"use client";

import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import axios from "axios";
import { MediaItemDto } from "@/types/media.types";
import { mediaKeys } from "./useMediaList";

export async function fetchMediaDetails(id: string): Promise<MediaItemDto> {
  const response = await axios.get<MediaItemDto>(`/api/v1/media/${id}`);
  return response.data;
}

export function useMediaDetails(
  id: string,
  options?: Omit<
    UseQueryOptions<MediaItemDto, Error, MediaItemDto, ReturnType<typeof mediaKeys.detail>>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: mediaKeys.detail(id),
    queryFn: () => fetchMediaDetails(id),
    enabled: Boolean(id),
    ...options,
  });
}
