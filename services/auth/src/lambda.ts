import { buildServer } from './infrastructure/server';

const app = buildServer();
let ready = false;

function getBody(event: any): string | undefined {
  if (!event.body) return undefined;
  return event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('utf8')
    : event.body;
}

function isAuthorized(event: any): boolean {
  const expected = process.env.INTERNAL_API_TOKEN;
  if (!expected) return true;
  const headers = event.headers || {};
  return headers['x-internal-api-token'] === expected || headers['X-Internal-Api-Token'] === expected;
}

export async function handler(event: any) {
  if (!isAuthorized(event)) {
    return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden' }) };
  }

  if (!ready) {
    await app.ready();
    ready = true;
  }

  const method = event.requestContext?.http?.method || event.httpMethod || 'GET';
  const rawPath = event.rawPath || event.path || '/';
  const query = event.rawQueryString ? `?${event.rawQueryString}` : '';
  const response = await app.inject({
    method,
    url: `${rawPath}${query}`,
    headers: event.headers || {},
    payload: getBody(event)
  });

  return {
    statusCode: response.statusCode,
    headers: response.headers,
    body: response.body,
    isBase64Encoded: false
  };
}
