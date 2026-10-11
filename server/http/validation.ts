import type { ZodType } from "zod";

import { idParamSchema } from "../../src/shared/schemas/entities";
import { HttpError } from "../errors";

export function parseBody<T>(schema: ZodType<T>, data: unknown): T {
  return parseWith(schema, data, "Invalid request data.");
}

export function parseQuery<T>(schema: ZodType<T>, data: unknown): T {
  return parseWith(schema, data, "Invalid query parameters.");
}

export function parseIdParam(value: unknown): number {
  const result = idParamSchema.safeParse(value);
  if (!result.success) {
    throw new HttpError(400, "Invalid id parameter.");
  }
  return result.data;
}

function parseWith<T>(schema: ZodType<T>, data: unknown, message: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
    throw new HttpError(400, message, details);
  }
  return result.data;
}
