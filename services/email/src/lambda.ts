import { EmailStatus } from './domain/entities/Email';
import { createEmailRuntime, createServer } from './infrastructure/server';

let appPromise: ReturnType<typeof createServer> | null = null;
let runtimePromise: ReturnType<typeof createEmailRuntime> | null = null;

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

async function handleHttp(event: any) {
  if (!isAuthorized(event)) {
    return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden' }) };
  }

  appPromise ??= createServer({ startQueueProcessor: false });
  const app = await appPromise;
  await app.ready();

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

async function processSqsRecord(record: any): Promise<void> {
  runtimePromise ??= createEmailRuntime();
  const runtime = await runtimePromise;
  const { emailId } = JSON.parse(record.body || record.Body || '{}');

  if (!emailId) {
    console.warn('SQS record without emailId');
    return;
  }

  const email = await runtime.emailRepository.findById(emailId);
  if (!email || email.status !== EmailStatus.PENDING) {
    return;
  }

  try {
    const sesMessageId = await runtime.emailProvider.sendEmail(email);
    email.markAsSent(sesMessageId);
    await runtime.emailRepository.update(email);
  } catch (error) {
    email.markAsFailed(error instanceof Error ? error.message : 'Unknown error');
    email.incrementRetry();
    await runtime.emailRepository.update(email);

    if (email.canRetry()) {
      throw error;
    }
  }
}

async function handleSqs(event: any) {
  const batchItemFailures: Array<{ itemIdentifier: string }> = [];

  for (const record of event.Records || []) {
    try {
      await processSqsRecord(record);
    } catch (error) {
      console.error('Error processing email SQS record:', error);
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }

  return { batchItemFailures };
}

export async function handler(event: any) {
  if (Array.isArray(event.Records)) {
    return handleSqs(event);
  }

  return handleHttp(event);
}
