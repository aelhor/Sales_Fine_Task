import { Router, type Router as ExpressRouter } from 'express';
import { validateBody, validateQuery } from '../common/http/validation.middleware';
import { TicketController } from './ticket.controller';
import { createTicketSchema, ticketPaginationSchema } from './ticket.schema';

/**
 * Creates the router for ticket HTTP endpoints.
 * @param ticketController Controller that handles ticket requests.
 * @returns Configured Express router for ticket routes.
 */
export function createTicketRouter(ticketController: TicketController): ExpressRouter {
  const router = Router();
  router.post('/', validateBody(createTicketSchema), ticketController.create);
  router.get('/', validateQuery(ticketPaginationSchema), ticketController.list);
  return router;
}
