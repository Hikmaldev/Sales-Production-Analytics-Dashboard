import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { CategoryListItem } from "../shared/schemas/responses";
import type { CreateCategoryRequest } from "../shared/schemas/requests";
import { apiFetch } from "./client";

export const categoryKeys = {
  all: ["product-categories"] as const,
  list: (activeOnly: boolean) => ["product-categories", { activeOnly }] as const,
};

/**
 * Filter bar uses activeOnly: true; the admin table loads all categories
 * (inactive ones keep their historical records, PRD §11.2).
 */
export function useProductCategories(options?: { activeOnly?: boolean }) {
  const activeOnly = options?.activeOnly ?? false;
  return useQuery({
    queryKey: categoryKeys.list(activeOnly),
    queryFn: () =>
      apiFetch<CategoryListItem[]>(
        `/product-categories${activeOnly ? "?active=true" : ""}`,
      ),
  });
}

/** Admin adds a category; it appears as a filter option right away. */
export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCategoryRequest) =>
      apiFetch<CategoryListItem>("/product-categories", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    },
  });
}

/** ACT-10 — deactivate or reactivate; never a hard delete. */
export function useUpdateCategoryActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      apiFetch<CategoryListItem>(`/product-categories/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    },
  });
}
