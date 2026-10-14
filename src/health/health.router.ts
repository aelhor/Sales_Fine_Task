import { Router } from 'express';
import { sendSuccess } from '../common/dto/api-response.interface';
import { HealthService } from './health.service';

/**
 * Creates HTTP routes for application liveness checks.
 * @param healthService Service that supplies liveness data.
 * @returns Express router for the health feature.
 */
export function createHealthRouter(healthService: HealthService): Router {
  const router = Router();

  router.get('/', (request, response): void => {
    sendSuccess(
      response,
      request.correlationId,
      'Application is healthy',
      healthService.getStatus(),
    );
  });

  return router;
}
