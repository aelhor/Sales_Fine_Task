import type { PaginationMeta } from '../common/dto/api-response.interface';

/**
 * Describes a ticket exposed by the public API.
 */
export interface Ticket {
  ticket_number: number;
  subject: string;
  description: string;
}

/**
 * Describes the validated data required to create a ticket.
 */
export type CreateTicketInput = Ticket;

/**
 * Describes the pagination values used to retrieve a ticket page.
 */
export interface TicketPagination {
  page: number;
  limit: number;
}

/**
 * Describes a ticket page returned by the persistence layer.
 */
export interface TicketPage {
  tickets: Ticket[];
  total: number;
}

/**
 * Describes a ticket-list result with pagination metadata.
 */
export interface TicketListResult {
  tickets: Ticket[];
  meta: PaginationMeta;
}
