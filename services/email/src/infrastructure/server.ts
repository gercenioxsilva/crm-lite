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

export async function createServer() {
  const app = Fastify({ logger: true });

  // MongoDB connection
  const mongoClient = new MongoClient(
    process.env.MONGODB_URL || 'mongodb://localhost:27017'
  );
  
  try {
    await mongoClient.connect();
    console.log('Connected to MongoDB');
  } catch (error) {
    console.warn('MongoDB connection failed, using in-memory storage');
  }

  // Infrastructure
  let emailRepository;
  try {
    emailRepository = new MongoEmailRepository(
      mongoClient,
      process.env.MONGODB_DB || 'crm_email'
    );
    console.log('Using MongoDB repository');
  } catch (error) {
    emailRepository = new InMemoryEmailRepository();
    console.log('Using in-memory repository');
  }
  
  // Use mock providers for development
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

  // Routes
  await registerRoutes(app, sendEmailUseCase, emailRepository);

  // Queue processor
  const processQueue = async () => {
    try {
      await processEmailQueueUseCase.execute();
    } catch (error) {
      console.error('Queue processing error:', error);
    }
    setTimeout(processQueue, 5000); // Process every 5 seconds
  };

  // Start queue processing
  processQueue();

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    try {
      await mongoClient.close();
    } catch (error) {
      console.warn('Error closing MongoDB connection:', error instanceof Error ? error.message : 'Unknown error');
    }
    await app.close();
  });

  return app;
}