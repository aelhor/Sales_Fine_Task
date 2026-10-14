import { AppException } from '../common/exceptions/app.exception';
import type { TicketRepository } from './ticket.repository';
import { TicketService } from './ticket.service';
import type { Ticket } from './ticket.types';

describe('TicketService', () => {
  const ticket: Ticket = {
    ticket_number: 1001,
    subject: 'Unable to update profile',
    description: 'Saving profile changes returns an error.',
  };
  let ticketRepository: jest.Mocked<TicketRepository>;
  let ticketService: TicketService;

  beforeEach(() => {
    ticketRepository = { create: jest.fn(), findPage: jest.fn() };
    ticketService = new TicketService(ticketRepository);
  });

  /**
   * Verifies that a created repository record is returned to the caller.
   * @returns Promise that resolves after the successful creation assertions complete.
   */
  it('creates a ticket when its number is unused', async () => {
    ticketRepository.create.mockResolvedValue(ticket);

    await expect(ticketService.createTicket(ticket)).resolves.toEqual(ticket);
    expect(ticketRepository.create.mock.calls).toEqual([[ticket]]);
  });

  /**
   * Verifies that an atomic duplicate outcome becomes a stable conflict error.
   * @returns Promise that resolves after the duplicate-ticket assertions complete.
   */
  it('rejects a duplicate ticket number with a conflict error', async () => {
    ticketRepository.create.mockResolvedValue(null);

    await expect(ticketService.createTicket(ticket)).rejects.toMatchObject({
      status: 409,
      code: 'TICKET_NUMBER_ALREADY_EXISTS',
      message: 'A ticket with this ticket_number already exists',
    } satisfies Partial<AppException>);
  });

  /**
   * Verifies that ticket retrieval returns repository records with pagination metadata.
   * @returns Promise that resolves after the ticket-list assertions complete.
   */
  it('returns a paginated ticket list without caching', async () => {
    ticketRepository.findPage.mockResolvedValue({ tickets: [ticket], total: 21 });

    await expect(ticketService.getTickets({ page: 2, limit: 20 })).resolves.toEqual({
      tickets: [ticket],
      meta: { page: 2, limit: 20, total: 21, totalPages: 2 },
    });
    expect(ticketRepository.findPage.mock.calls).toEqual([[{ page: 2, limit: 20 }]]);
  });

  /**
   * Verifies that unexpected persistence failures remain visible to the global handler.
   * @returns Promise that resolves after the error-propagation assertion completes.
   */
  it('propagates unexpected ticket persistence failures', async () => {
    ticketRepository.create.mockRejectedValue(new Error('Database unavailable'));

    await expect(ticketService.createTicket(ticket)).rejects.toThrow('Database unavailable');
  });
});
