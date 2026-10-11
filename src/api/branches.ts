import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { BranchListItem } from "../shared/schemas/responses";
import type { CreateBranchRequest } from "../shared/schemas/requests";
import { apiFetch } from "./client";

export const branchKeys = {
  all: ["branches"] as const,
  list: (activeOnly: boolean) => ["branches", { activeOnly }] as const,
};

/**
 * Filter bar uses activeOnly: true; the admin table loads all branches
 * (inactive ones keep their historical records, PRD §11.2).
 */
export function useBranches(options?: { activeOnly?: boolean }) {
  const activeOnly = options?.activeOnly ?? false;
  return useQuery({
    queryKey: branchKeys.list(activeOnly),
    queryFn: () =>
      apiFetch<BranchListItem[]>(
        `/branches${activeOnly ? "?active=true" : ""}`,
      ),
  });
}

/** Admin adds a branch; it appears as a filter option right away. */
export function useCreateBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBranchRequest) =>
      apiFetch<BranchListItem>("/branches", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: branchKeys.all });
    },
  });
}

/** ACT-10 — deactivate or reactivate; never a hard delete. */
export function useUpdateBranchActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      apiFetch<BranchListItem>(`/branches/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: branchKeys.all });
    },
  });
}
