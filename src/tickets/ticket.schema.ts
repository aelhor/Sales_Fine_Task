import { z } from 'zod';

/**
 * Validates the request body required to submit a ticket.
 */
export const createTicketSchema = z.object({
  ticket_number: z.number().int().min(1).max(2_147_483_647),
  subject: z.string().trim().min(1).max(255),
  description: z.string().trim().min(1),
});

/**
 * Describes the validated request body required to submit a ticket.
 */
export type CreateTicketRequest = z.output<typeof createTicketSchema>;

/**
 * Validates optional ticket-list pagination query parameters.
 */
export const ticketPaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * Describes validated ticket-list pagination query parameters.
 */
export type TicketPaginationQuery = z.output<typeof ticketPaginationSchema>;
