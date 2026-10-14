/**
 * Builds the OpenAPI paths for ticket endpoints.
 * @returns OpenAPI path definitions for ticket routes.
 */
export function createTicketOpenApiPaths(): Record<string, object> {
  return {
    '/tickets': {
      post: {
        tags: ['Tickets'],
        summary: 'Submit a ticket',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['ticket_number', 'subject', 'description'],
                properties: {
                  ticket_number: { type: 'integer', minimum: 1, maximum: 2_147_483_647 },
                  subject: { type: 'string', maxLength: 255 },
                  description: { type: 'string', minLength: 1 },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Ticket created successfully.',
            content: {
              'application/json': {
                example: {
                  message: 'Ticket created successfully',
                  data: {
                    ticket_number: 1001,
                    subject: 'Unable to update profile',
                    description: 'Saving my profile changes returns an error.',
                  },
                  correlationId: '8e2cb7b2-41b1-4205-8df4-83e7e53999db',
                },
              },
            },
          },
          '400': { description: 'Ticket request validation failed.' },
          '409': { description: 'The ticket number already exists.' },
        },
      },
      get: {
        tags: ['Tickets'],
        summary: 'List tickets',
        description: 'Retrieves a newest-first ticket page without caching.',
        parameters: [
          {
            name: 'page',
            in: 'query',
            required: false,
            description: 'One-based page number. Defaults to 1.',
            schema: { type: 'integer', minimum: 1, default: 1 },
          },
          {
            name: 'limit',
            in: 'query',
            required: false,
            description: 'Number of tickets per page. Defaults to 20 and cannot exceed 100.',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          },
        ],
        responses: {
          '200': {
            description: 'Tickets retrieved successfully.',
            content: {
              'application/json': {
                example: {
                  message: 'Tickets retrieved successfully',
                  data: [
                    {
                      ticket_number: 1001,
                      subject: 'Unable to update profile',
                      description: 'Saving my profile changes returns an error.',
                    },
                  ],
                  meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
                  correlationId: '8e2cb7b2-41b1-4205-8df4-83e7e53999db',
                },
              },
            },
          },
          '400': { description: 'Ticket pagination validation failed.' },
        },
      },
    },
  };
}
