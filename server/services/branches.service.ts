import type { Branch as PrismaBranch } from "../../generated/prisma/client";
import type { BranchListItem } from "../../src/shared/schemas/responses";
import type { CreateBranchRequest } from "../../src/shared/schemas/requests";
import { prisma } from "../db";
import { HttpError } from "../errors";

type BranchWithCount = PrismaBranch & { _count: { salesRecords: number } };

/** GET /branches — filter options (active only) and the admin table (all). */
export async function listBranches(
  options: { activeOnly?: boolean } = {},
): Promise<BranchListItem[]> {
  const branches = await prisma.branch.findMany({
    where: options.activeOnly ? { isActive: true } : undefined,
    include: { _count: { select: { salesRecords: true } } },
    orderBy: { name: "asc" },
  });
  return branches.map(toBranchListItem);
}

/** POST /branches — admin adds a branch; it appears in filters immediately. */
export async function createBranch(
  input: CreateBranchRequest,
): Promise<BranchListItem> {
  const name = input.name.trim();

  const existing = await prisma.branch.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });
  if (existing) {
    throw new HttpError(409, "A branch with this name already exists.");
  }

  const created = await prisma.branch.create({
    data: { name, region: input.region?.trim() || null },
  });

  return { ...toBranch(created), recordCount: 0 };
}

/**
 * ACT-10 — deactivate/reactivate. Branches are never hard-deleted so
 * historical reporting stays intact (PRD §11.2).
 */
export async function updateBranchActive(
  id: number,
  isActive: boolean,
): Promise<BranchListItem> {
  const existing = await prisma.branch.findUnique({ where: { id: BigInt(id) } });
  if (!existing) {
    throw new HttpError(404, "Branch not found.");
  }

  const updated = await prisma.branch.update({
    where: { id: existing.id },
    data: { isActive },
    include: { _count: { select: { salesRecords: true } } },
  });

  return toBranchListItem(updated);
}

function toBranch(branch: PrismaBranch) {
  return {
    id: Number(branch.id),
    name: branch.name,
    region: branch.region,
    isActive: branch.isActive,
  };
}

function toBranchListItem(branch: BranchWithCount): BranchListItem {
  return { ...toBranch(branch), recordCount: branch._count.salesRecords };
}
