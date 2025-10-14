import { buildServer } from './infrastructure/server';
const port = Number(process.env.AUTH_PORT ?? 3050);
const app = buildServer();
app.listen({ port, host: '0.0.0.0' })
  .then(() => (app.log as any).info('auth up on :' + port))
  .catch((err) => { (app.log as any).error(err); process.exit(1); });