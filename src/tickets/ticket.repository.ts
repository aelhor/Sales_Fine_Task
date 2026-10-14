import type { Knex } from 'knex';
import type { CreateTicketInput, Ticket, TicketPage, TicketPagination } from './ticket.types';

/**
 * Defines persistence operations required by the ticket service.
 */
export interface TicketRepository {
  create(input: CreateTicketInput): Promise<Ticket | null>;
  findPage(pagination: TicketPagination): Promise<TicketPage>;
}

/**
 * Persists and retrieves tickets through Knex.
 */
export class KnexTicketRepository implements TicketRepository {
  /**
   * Creates a ticket repository using the shared Knex client.
   * @param database Knex client used for ticket queries.
   */
  constructor(private readonly database: Knex) {}

  /**
   * Atomically creates a ticket or returns null when its number already exists.
   * @param input Validated ticket data to persist.
   * @returns Created ticket, or null when the ticket number is already in use.
   */
  async create(input: CreateTicketInput): Promise<Ticket | null> {
    const tickets = await this.database('tickets')
      .insert(input)
      .onConflict('ticket_number')
      .ignore()
      .returning<Ticket[]>(['ticket_number', 'subject', 'description']);

    return tickets[0] ?? null;
  }

  /**
   * Retrieves one newest-first ticket page and the total number of tickets.
   * @param pagination Requested page and page size.
   * @returns Public ticket records and their total count.
   */
  async findPage(pagination: TicketPagination): Promise<TicketPage> {
    const [tickets, totalRow] = await Promise.all([
      this.database.raw<{ rows: Ticket[] }>(
        `
          SELECT ticket_number, subject, description
          FROM tickets
          ORDER BY created_at DESC, id DESC
          LIMIT ?
          OFFSET ?
        `,
        [pagination.limit, (pagination.page - 1) * pagination.limit],
      ),
      this.database('tickets').count<{ count: string }>('id as count').first(),
    ]);

    return { tickets: tickets.rows, total: Number(totalRow?.count ?? 0) };
  }
}
