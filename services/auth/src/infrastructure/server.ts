import Fastify from 'fastify';
import { registerRoutes } from '../interfaces/http/routes';
export function buildServer(){
  const app = Fastify({ logger: true });
  app.addContentTypeParser('application/x-www-form-urlencoded', { parseAs: 'string' }, (_req, body, done) => {
    const params = new URLSearchParams(body as string);
    done(null, Object.fromEntries(params.entries()));
  });
  app.register(registerRoutes);
  return app;
}
