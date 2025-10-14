import { buildServer } from './infrastructure/server';
const port = Number(process.env.API_GATEWAY_PORT ?? 3000);
const app = buildServer();
app.listen({ port, host: '0.0.0.0' })
  .then(() => (app.log as any).info('api-gateway up on :' + port))
  .catch((err) => { (app.log as any).error(err); process.exit(1); });