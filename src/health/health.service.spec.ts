import { HealthService } from './health.service';

describe('HealthService', () => {
  /**
   * Verifies that the service returns a liveness payload.
   * @returns Nothing after assertion completion.
   */
  it('returns an ok status and ISO timestamp', () => {
    const service = new HealthService();
    const result = service.getStatus();

    expect(result.status).toBe('ok');
    expect(Number.isNaN(Date.parse(result.timestamp))).toBe(false);
  });
});
