import { Prisma } from "../../generated/prisma/client";
import type { CategoryListItem } from "../../src/shared/schemas/responses";
import type { CreateCategoryRequest } from "../../src/shared/schemas/requests";
import { prisma } from "../db";
import { HttpError } from "../errors";

/** GET /product-categories — filter options (active only) and admin table. */
export async function listCategories(
  options: { activeOnly?: boolean } = {},
): Promise<CategoryListItem[]> {
  const categories = await prisma.productCategory.findMany({
    where: options.activeOnly ? { isActive: true } : undefined,
    include: { _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  });

  const counts = await prisma.$queryRaw<
    Array<{ category_id: number; record_count: number }>
  >(Prisma.sql`
    SELECT p.category_id::int AS category_id, COUNT(sr.id)::int AS record_count
    FROM products p
    LEFT JOIN sales_records sr ON sr.product_id = p.id
    GROUP BY p.category_id
  `);
  const recordCountById = new Map(
    counts.map((row) => [row.category_id, row.record_count]),
  );

  return categories.map((category) => ({
    id: Number(category.id),
    name: category.name,
    isActive: category.isActive,
    productCount: category._count.products,
    recordCount: recordCountById.get(Number(category.id)) ?? 0,
  }));
}

/** POST /product-categories — admin adds a category. */
export async function createCategory(
  input: CreateCategoryRequest,
): Promise<CategoryListItem> {
  const name = input.name.trim();

  const existing = await prisma.productCategory.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });
  if (existing) {
    throw new HttpError(409, "A category with this name already exists.");
  }

  const created = await prisma.productCategory.create({ data: { name } });

  return {
    id: Number(created.id),
    name: created.name,
    isActive: created.isActive,
    productCount: 0,
    recordCount: 0,
  };
}

/**
 * ACT-10 — deactivate/reactivate. Categories are never hard-deleted so
 * historical reporting stays intact (PRD §11.2).
 */
export async function updateCategoryActive(
  id: number,
  isActive: boolean,
): Promise<CategoryListItem> {
  const existing = await prisma.productCategory.findUnique({
    where: { id: BigInt(id) },
  });
  if (!existing) {
    throw new HttpError(404, "Category not found.");
  }

  const updated = await prisma.productCategory.update({
    where: { id: existing.id },
    data: { isActive },
    include: { _count: { select: { products: true } } },
  });

  const counts = await prisma.$queryRaw<Array<{ record_count: number }>>(
    Prisma.sql`
      SELECT COUNT(sr.id)::int AS record_count
      FROM sales_records sr
      JOIN products p ON p.id = sr.product_id
      WHERE p.category_id = ${id}
    `,
  );

  return {
    id: Number(updated.id),
    name: updated.name,
    isActive: updated.isActive,
    productCount: updated._count.products,
    recordCount: counts[0]?.record_count ?? 0,
  };
}
