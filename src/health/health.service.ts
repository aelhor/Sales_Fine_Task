/**
 * Supplies application liveness data for infrastructure health checks.
 */
export class HealthService {
  /**
   * Returns the current application liveness status.
   * @returns Health status and UTC timestamp.
   */
  getStatus(): { status: 'ok'; timestamp: string } {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
