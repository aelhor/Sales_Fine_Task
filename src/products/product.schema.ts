import { z } from 'zod';

/**
 * Validates optional product-list pagination query parameters.
 */
export const productPaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * Describes validated product-list pagination query parameters.
 */
export type ProductPaginationQuery = z.output<typeof productPaginationSchema>;
