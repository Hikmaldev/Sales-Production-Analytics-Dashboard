import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { User } from "../shared/schemas/entities";
import type { CreateUserRequest } from "../shared/schemas/requests";
import { apiFetch } from "./client";

export const userKeys = {
  all: ["users"] as const,
};

/** GET /api/v1/users (admin only). */
export function useUsers() {
  return useQuery({
    queryKey: userKeys.all,
    queryFn: () => apiFetch<User[]>("/users"),
  });
}

/** ACT-09 — admin creates a user and sets the initial password. */
export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateUserRequest) =>
      apiFetch<User>("/users", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}
