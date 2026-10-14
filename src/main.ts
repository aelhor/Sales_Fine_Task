import 'dotenv/config';
import type { Server } from 'node:http';
import { createApplication, type ApplicationResources } from './app';
import { validateEnvironment } from './config/environment.validation';

/**
 * Starts the Express HTTP server and registers graceful shutdown handlers.
 * @returns Nothing after creating the HTTP server.
 */
function bootstrap(): void {
  const configuration = validateEnvironment(process.env);
  const { app, resources } = createApplication(configuration);
  const server = app.listen(configuration.PORT, () => {
    console.log(`API listening on port ${configuration.PORT}`);
  });

  registerShutdownHandler(server, resources);
}

/**
 * Closes the HTTP server and shared resources when the process stops.
 * @param server Running HTTP server.
 * @param resources Shared resources that require cleanup.
 * @returns Nothing after registering signal listeners.
 */
function registerShutdownHandler(server: Server, resources: ApplicationResources): void {
  const shutdown = (signal: NodeJS.Signals): void => {
    console.log(`Received ${signal}, starting graceful shutdown`);
    server.close(() => {
      void resources.close().finally(() => process.exit(0));
    });
  };

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap();
