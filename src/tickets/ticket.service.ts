import { AppException } from '../common/exceptions/app.exception';
import type { TicketRepository } from './ticket.repository';
import type { CreateTicketInput, Ticket, TicketListResult, TicketPagination } from './ticket.types';

/**
 * Coordinates ticket submission and retrieval behaviour.
 */
export class TicketService {
  /**
   * Creates a ticket service using its persistence dependency.
   * @param ticketRepository Repository used to create and retrieve tickets.
   */
  constructor(private readonly ticketRepository: TicketRepository) {}

  /**
   * Creates a ticket when its business number is unused.
   * @param input Validated ticket data to create.
   * @returns Newly created ticket.
   * @throws AppException When the ticket number already exists.
   */
  async createTicket(input: CreateTicketInput): Promise<Ticket> {
    const ticket = await this.ticketRepository.create(input);
    if (ticket !== null) return ticket;

    throw new AppException({
      status: 409,
      code: 'TICKET_NUMBER_ALREADY_EXISTS',
      message: 'A ticket with this ticket_number already exists',
      details: [{ field: 'ticket_number', message: 'Must be unique' }],
    });
  }

  /**
   * Retrieves one newest-first page of tickets without caching.
   * @param pagination Requested page and page size.
   * @returns Ticket list with pagination metadata.
   */
  async getTickets(pagination: TicketPagination): Promise<TicketListResult> {
    const ticketPage = await this.ticketRepository.findPage(pagination);

    return {
      tickets: ticketPage.tickets,
      meta: {
        page: pagination.page,
        limit: pagination.limit,
        total: ticketPage.total,
        totalPages: Math.ceil(ticketPage.total / pagination.limit),
      },
    };
  }
}
