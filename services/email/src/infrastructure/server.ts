import Fastify from 'fastify';
import { MongoClient } from 'mongodb';
import { MongoEmailRepository } from './repositories/MongoEmailRepository';
import { InMemoryEmailRepository } from './repositories/InMemoryEmailRepository';
import { SESEmailProvider } from './email/SESEmailProvider';
import { MockEmailProvider } from './email/MockEmailProvider';
import { SQSMessageQueue } from './messaging/SQSMessageQueue';
import { MockMessageQueue } from './messaging/MockMessageQueue';
import { SendEmailUseCase } from '../application/usecases/SendEmailUseCase';
import { ProcessEmailQueueUseCase } from '../application/usecases/ProcessEmailQueueUseCase';
import { registerRoutes } from '../interfaces/http/routes';

export async function createEmailRuntime() {
  const mongoClient = new MongoClient(
    process.env.MONGODB_URL || 'mongodb://localhost:27017'
  );

  let mongoConnected = false;
  
  try {
    await mongoClient.connect();
    mongoConnected = true;
    console.log('Connected to MongoDB');
  } catch (error) {
    console.warn('MongoDB connection failed, using in-memory storage');
  }

  let emailRepository;
  if (mongoConnected) {
    emailRepository = new MongoEmailRepository(
      mongoClient,
      process.env.MONGODB_DB || 'crm_email'
    );
    console.log('Using MongoDB repository');
  } else {
    emailRepository = new InMemoryEmailRepository();
    console.log('Using in-memory repository');
  }
  
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const hasAwsConfig = process.env.AWS_ACCESS_KEY_ID && process.env.SQS_QUEUE_URL;
  
  const emailProvider = (isDevelopment && !hasAwsConfig) 
    ? new MockEmailProvider()
    : new SESEmailProvider(process.env.AWS_REGION || 'us-east-1');
  
  const messageQueue = (isDevelopment && !hasAwsConfig)
    ? new MockMessageQueue()
    : new SQSMessageQueue(
        process.env.SQS_QUEUE_URL || '',
        process.env.AWS_REGION || 'us-east-1'
      );
      
  console.log('Email provider:', emailProvider.constructor.name);
  console.log('Message queue:', messageQueue.constructor.name);

  // Use cases
  const sendEmailUseCase = new SendEmailUseCase(emailRepository, messageQueue);
  const processEmailQueueUseCase = new ProcessEmailQueueUseCase(
    emailRepository,
    emailProvider,
    messageQueue
  );

  return {
    mongoClient,
    emailRepository,
    emailProvider,
    messageQueue,
    sendEmailUseCase,
    processEmailQueueUseCase
  };
}

export async function createServer(options: { startQueueProcessor?: boolean } = {}) {
  const app = Fastify({ logger: true });
  const runtime = await createEmailRuntime();

  await registerRoutes(app, runtime.sendEmailUseCase, runtime.emailRepository);

  const processQueue = async () => {
    try {
      await runtime.processEmailQueueUseCase.execute();
    } catch (error) {
      console.error('Queue processing error:', error);
    }
    setTimeout(processQueue, 5000); // Process every 5 seconds
  };

  if (options.startQueueProcessor ?? true) {
    processQueue();
  }

  process.on('SIGTERM', async () => {
    try {
      await runtime.mongoClient.close();
    } catch (error) {
      console.warn('Error closing MongoDB connection:', error instanceof Error ? error.message : 'Unknown error');
    }
    await app.close();
  });

  return app;
}
