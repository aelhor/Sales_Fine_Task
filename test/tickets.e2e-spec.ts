import request from 'supertest';
import { createApplication, type ApplicationResources } from '../src/app';
import type { ApiSuccessResponse, PaginationMeta } from '../src/common/dto/api-response.interface';
import { createDatabaseClient } from '../src/database/database.client';
import type { Ticket } from '../src/tickets/ticket.types';
import { createTestConfiguration } from './support/test-configuration';

/**
 * Checks whether an unknown value is a ticket success response.
 * @param value Parsed response body to validate.
 * @returns Whether the value follows the ticket success response contract.
 */
function isTicketResponse(
  value: unknown,
): value is ApiSuccessResponse<Ticket[]> & { meta: PaginationMeta } {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    candidate.message === 'Tickets retrieved successfully' &&
    typeof candidate.correlationId === 'string' &&
    Array.isArray(candidate.data) &&
    typeof candidate.meta === 'object' &&
    candidate.meta !== null
  );
}

/**
 * Checks whether an unknown value is a ticket-creation success response.
 * @param value Parsed response body to validate.
 * @returns Whether the value follows the ticket-creation success contract.
 */
function isCreatedTicketResponse(value: unknown): value is ApiSuccessResponse<Ticket> {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    candidate.message === 'Ticket created successfully' &&
    typeof candidate.correlationId === 'string' &&
    typeof candidate.data === 'object' &&
    candidate.data !== null
  );
}

describe('Tickets endpoint', () => {
  const configuration = createTestConfiguration();
  const listTickets: Ticket[] = [
    {
      ticket_number: 1_900_000_001,
      subject: 'First ticket for pagination',
      description: 'Created first for pagination ordering verification.',
    },
    {
      ticket_number: 1_900_000_002,
      subject: 'Second ticket for pagination',
      description: 'Created second for pagination ordering verification.',
    },
  ];
  const createdTicket: Ticket = {
    ticket_number: 1_900_000_003,
    subject: 'Unable to update profile',
    description: 'Saving profile changes returns an error.',
  };
  const duplicateTicket: Ticket = {
    ticket_number: 1_900_000_004,
    subject: 'Duplicate ticket test',
    description: 'This ticket verifies the duplicate ticket-number response.',
  };
  const freshTicket: Ticket = {
    ticket_number: 1_900_000_005,
    subject: 'Fresh ticket without cache',
    description: 'This ticket must appear on the next list request.',
  };
  const testTicketNumbers = [
    ...listTickets.map((ticket) => ticket.ticket_number),
    createdTicket.ticket_number,
    duplicateTicket.ticket_number,
    freshTicket.ticket_number,
  ];
  let application: ReturnType<typeof createApplication>['app'];
  let applicationResources: ApplicationResources;
  let database: ReturnType<typeof createDatabaseClient>;

  beforeAll(async () => {
    database = createDatabaseClient(configuration);
    await database('tickets').whereIn('ticket_number', testTicketNumbers).delete();
    await database('tickets').insert([
      { ...listTickets[0], created_at: '2026-01-01T00:00:00.000Z' },
      { ...listTickets[1], created_at: '2026-01-02T00:00:00.000Z' },
    ]);

    const createdApplication = createApplication(configuration);
    application = createdApplication.app;
    applicationResources = createdApplication.resources;
  });

  afterAll(async () => {
    await applicationResources.close();
    await database('tickets').whereIn('ticket_number', testTicketNumbers).delete();
    await database.destroy();
  });

  /**
   * Verifies that a valid ticket request creates and returns a ticket.
   * @returns Promise that resolves after the creation assertions complete.
   */
  it('creates a ticket using the shared success response', async () => {
    const response = await request(application)
      .post('/api/v1/tickets')
      .send(createdTicket)
      .expect(201);
    const responseBody: unknown = JSON.parse(response.text);

    expect(isCreatedTicketResponse(responseBody)).toBe(true);
    if (!isCreatedTicketResponse(responseBody)) {
      throw new Error('Created-ticket response did not match the API contract');
    }
    expect(responseBody.data).toEqual(createdTicket);
    expect(responseBody.correlationId).toEqual(expect.any(String));
  });

  /**
   * Verifies that the API rejects missing required ticket fields.
   * @param body Request body missing one required ticket field.
   * @returns Promise that resolves after the validation assertions complete.
   */
  it.each<{ body: Record<string, unknown> }>([
    { body: { subject: 'Missing number', description: 'Description' } },
    { body: { ticket_number: 1_900_000_010, description: 'Description' } },
    { body: { ticket_number: 1_900_000_011, subject: 'Missing description' } },
  ])('rejects a request with a missing required field', async ({ body }) => {
    const response = await request(application).post('/api/v1/tickets').send(body).expect(400);
    const responseBody: unknown = JSON.parse(response.text);

    expect(responseBody).toMatchObject({
      message: 'Request validation failed',
      error: { code: 'VALIDATION_ERROR' },
    });
  });

  /**
   * Verifies that semantically empty ticket text is rejected.
   * @param field Ticket text field supplied as whitespace only.
   * @returns Promise that resolves after the whitespace-validation assertions complete.
   */
  it.each(['subject', 'description'])('rejects a whitespace-only %s', async (field) => {
    const body =
      field === 'subject'
        ? { ...createdTicket, ticket_number: 1_900_000_012, subject: ' ' }
        : { ...createdTicket, ticket_number: 1_900_000_012, description: ' ' };
    const response = await request(application).post('/api/v1/tickets').send(body).expect(400);
    const responseBody: unknown = JSON.parse(response.text);

    expect(responseBody).toMatchObject({
      message: 'Request validation failed',
      error: { code: 'VALIDATION_ERROR' },
    });
  });

  /**
   * Verifies that invalid ticket numbers are rejected before persistence.
   * @param ticketNumber Invalid ticket-number value supplied by the client.
   * @returns Promise that resolves after the ticket-number validation assertions complete.
   */
  it.each([0, 1.5, 2_147_483_648, '1900000012'])(
    'rejects invalid ticket number %s',
    async (ticketNumber) => {
      const response = await request(application)
        .post('/api/v1/tickets')
        .send({ ...createdTicket, ticket_number: ticketNumber })
        .expect(400);
      const responseBody: unknown = JSON.parse(response.text);

      expect(responseBody).toMatchObject({
        message: 'Request validation failed',
        error: { code: 'VALIDATION_ERROR' },
      });
    },
  );

  /**
   * Verifies that concurrent duplicate numbers create one ticket and one conflict.
   * @returns Promise that resolves after the concurrent duplicate-ticket assertions complete.
   */
  it('rejects a concurrent duplicate ticket number', async () => {
    const responses = await Promise.all([
      request(application).post('/api/v1/tickets').send(duplicateTicket),
      request(application).post('/api/v1/tickets').send(duplicateTicket),
    ]);
    const createdResponse = responses.find((response) => response.status === 201);
    const conflictResponse = responses.find((response) => response.status === 409);

    expect(createdResponse).toBeDefined();
    expect(conflictResponse).toBeDefined();
    if (conflictResponse === undefined) throw new Error('Expected one conflict response');
    const responseBody: unknown = JSON.parse(conflictResponse.text);

    expect(responseBody).toMatchObject({
      message: 'A ticket with this ticket_number already exists',
      error: {
        code: 'TICKET_NUMBER_ALREADY_EXISTS',
        details: [{ field: 'ticket_number', message: 'Must be unique' }],
      },
    });
  });

  /**
   * Verifies pagination, newest-first ordering, and uncached ticket retrieval.
   * @returns Promise that resolves after ticket-list assertions complete.
   */
  it('retrieves newest-first paginated tickets without caching', async () => {
    const firstPageResponse = await request(application)
      .get('/api/v1/tickets?page=1&limit=1')
      .expect(200);
    const secondPageResponse = await request(application)
      .get('/api/v1/tickets?page=2&limit=1')
      .expect(200);
    const beforeFreshTicketResponse = await request(application)
      .get('/api/v1/tickets?page=1&limit=100')
      .expect(200);
    const defaultResponse = await request(application).get('/api/v1/tickets').expect(200);
    const firstPageBody: unknown = JSON.parse(firstPageResponse.text);
    const secondPageBody: unknown = JSON.parse(secondPageResponse.text);
    const beforeFreshTicketBody: unknown = JSON.parse(beforeFreshTicketResponse.text);
    const defaultBody: unknown = JSON.parse(defaultResponse.text);

    expect(firstPageResponse.headers['x-cache']).toBeUndefined();
    expect(isTicketResponse(firstPageBody)).toBe(true);
    expect(isTicketResponse(secondPageBody)).toBe(true);
    expect(isTicketResponse(beforeFreshTicketBody)).toBe(true);
    expect(isTicketResponse(defaultBody)).toBe(true);
    if (
      !isTicketResponse(firstPageBody) ||
      !isTicketResponse(secondPageBody) ||
      !isTicketResponse(beforeFreshTicketBody) ||
      !isTicketResponse(defaultBody)
    ) {
      throw new Error('Ticket-list response did not match the API contract');
    }
    expect(firstPageBody.data).toHaveLength(1);
    expect(secondPageBody.data).toHaveLength(1);
    const firstTicket = firstPageBody.data[0];
    const secondTicket = secondPageBody.data[0];
    if (firstTicket === undefined || secondTicket === undefined) {
      throw new Error('Expected one ticket on each page');
    }
    expect(firstTicket.ticket_number).not.toBe(secondTicket.ticket_number);
    expect(firstPageBody.meta.total).toBe(secondPageBody.meta.total);
    expect(defaultBody.meta).toMatchObject({ page: 1, limit: 20 });
    const olderSeedTicket = listTickets[0];
    const newerSeedTicket = listTickets[1];
    if (olderSeedTicket === undefined || newerSeedTicket === undefined) {
      throw new Error('Expected both seeded tickets');
    }
    const newerSeedTicketIndex = beforeFreshTicketBody.data.findIndex(
      (ticket) => ticket.ticket_number === newerSeedTicket.ticket_number,
    );
    const olderSeedTicketIndex = beforeFreshTicketBody.data.findIndex(
      (ticket) => ticket.ticket_number === olderSeedTicket.ticket_number,
    );
    expect(newerSeedTicketIndex).toBeGreaterThanOrEqual(0);
    expect(olderSeedTicketIndex).toBeGreaterThanOrEqual(0);
    expect(newerSeedTicketIndex).toBeLessThan(olderSeedTicketIndex);

    await database('tickets').insert(freshTicket);

    const afterFreshTicketResponse = await request(application)
      .get('/api/v1/tickets?page=1&limit=100')
      .expect(200);
    const afterFreshTicketBody: unknown = JSON.parse(afterFreshTicketResponse.text);

    expect(isTicketResponse(afterFreshTicketBody)).toBe(true);
    if (!isTicketResponse(afterFreshTicketBody)) {
      throw new Error('Ticket-list response did not match the API contract');
    }
    expect(afterFreshTicketBody.data).toContainEqual(freshTicket);
    expect(afterFreshTicketBody.meta.total).toBe(beforeFreshTicketBody.meta.total + 1);
  });

  /**
   * Verifies that invalid ticket-list pagination uses the shared error envelope.
   * @returns Promise that resolves after the validation assertions complete.
   */
  it('rejects invalid ticket-list pagination', async () => {
    const response = await request(application).get('/api/v1/tickets?limit=101').expect(400);
    const responseBody: unknown = JSON.parse(response.text);

    expect(responseBody).toMatchObject({
      message: 'Request validation failed',
      error: { code: 'VALIDATION_ERROR' },
    });
  });
});
