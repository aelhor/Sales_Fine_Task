import type { NextFunction, Request, Response } from 'express';
import { sendSuccess } from '../common/dto/api-response.interface';
import type { CreateTicketRequest, TicketPaginationQuery } from './ticket.schema';
import { TicketService } from './ticket.service';

/**
 * Handles HTTP requests for ticket resources.
 */
export class TicketController {
  /**
   * Creates a ticket controller using the ticket service.
   * @param ticketService Service that creates and retrieves tickets.
   */
  constructor(private readonly ticketService: TicketService) {}

  /**
   * Submits a ticket using the shared API envelope.
   * @param request Express request carrying validated ticket data and correlation ID.
   * @param response Express response used to send the created ticket.
   * @param next Express callback used to forward unexpected errors.
   * @returns Nothing after sending a response or forwarding an error.
   */
  readonly create = async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const ticket = await this.ticketService.createTicket(request.body as CreateTicketRequest);
      sendSuccess(response, request.correlationId, 'Ticket created successfully', ticket, {
        status: 201,
      });
    } catch (error: unknown) {
      next(error);
    }
  };

  /**
   * Sends the newest-first ticket list using the shared API envelope.
   * @param request Express request carrying validated pagination and correlation ID.
   * @param response Express response used to send the ticket list.
   * @param next Express callback used to forward unexpected errors.
   * @returns Nothing after sending a response or forwarding an error.
   */
  readonly list = async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const pagination = request.validatedQuery as TicketPaginationQuery;
      const result = await this.ticketService.getTickets(pagination);
      sendSuccess(
        response,
        request.correlationId,
        'Tickets retrieved successfully',
        result.tickets,
        {
          meta: result.meta,
        },
      );
    } catch (error: unknown) {
      next(error);
    }
  };
}
