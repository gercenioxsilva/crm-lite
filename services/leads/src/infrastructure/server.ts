import Fastify from 'fastify';
import { registerRoutes } from '../interfaces/http/routes';

export function buildServer() {
  const app = Fastify({ 
    logger: true,
    disableRequestLogging: false
  });

  // CORS for development
  app.register(require('@fastify/cors'), {
    origin: ['http://localhost:3010', 'http://localhost:3030', 'http://localhost:3000'],
    credentials: true
  });

  // Register routes
  app.register(registerRoutes);

  return app;
}