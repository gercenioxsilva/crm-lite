import Fastify from 'fastify';
import { registerRoutes } from '../interfaces/http/routes';
export function buildServer(){
  const app = Fastify({ logger: true });
  app.register(registerRoutes);
  return app;
}
