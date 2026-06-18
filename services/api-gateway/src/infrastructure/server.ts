import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { registerRoutes } from '../interfaces/http/routes';
export function buildServer(){
  const app = Fastify({ logger: true });
  app.addContentTypeParser('application/x-www-form-urlencoded', { parseAs: 'string' }, (_req, body, done) => {
    const params = new URLSearchParams(body as string);
    done(null, Object.fromEntries(params.entries()));
  });
  app.register(cors, { origin: true, credentials: false });
  app.register(swagger, {
    openapi: {
      info: { title: 'Quiz API Gateway', version: '0.1.0' },
      servers: [{ url: 'http://localhost:3000' }],
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
        }
      }
    }
  });
  app.register(swaggerUi, { routePrefix: '/docs', uiConfig: { docExpansion: 'list', deepLinking: false } });
  app.register(registerRoutes);
  return app;
}
