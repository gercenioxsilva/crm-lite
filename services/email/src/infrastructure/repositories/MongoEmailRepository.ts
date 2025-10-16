import { MongoClient, Db, Collection } from 'mongodb';
import { Email, EmailStatus } from '../../domain/entities/Email';
import { EmailRepository } from '../../domain/repositories/EmailRepository';

export class MongoEmailRepository implements EmailRepository {
  private db: Db;
  private collection: Collection;

  constructor(mongoClient: MongoClient, dbName: string) {
    this.db = mongoClient.db(dbName);
    this.collection = this.db.collection('emails');
  }

  async save(email: Email): Promise<void> {
    await this.collection.insertOne(this.toDocument(email));
  }

  async findById(id: string): Promise<Email | null> {
    const doc = await this.collection.findOne({ _id: id } as any);
    return doc ? this.toDomain(doc) : null;
  }

  async findByStatus(status: EmailStatus): Promise<Email[]> {
    const docs = await this.collection.find({ status } as any).toArray();
    return docs.map(doc => this.toDomain(doc));
  }

  async findByLeadId(leadId: string): Promise<Email[]> {
    const docs = await this.collection.find({ leadId } as any).toArray();
    return docs.map(doc => this.toDomain(doc));
  }

  async update(email: Email): Promise<void> {
    await this.collection.updateOne(
      { _id: email.id } as any,
      { $set: this.toDocument(email) }
    );
  }

  async findPendingRetries(): Promise<Email[]> {
    const docs = await this.collection.find({
      status: EmailStatus.FAILED,
      retryCount: { $lt: 3 }
    } as any).toArray();
    return docs.map(doc => this.toDomain(doc));
  }

  private toDocument(email: Email): any {
    return {
      _id: email.id,
      from: email.from,
      to: email.to,
      subject: email.subject,
      htmlBody: email.htmlBody,
      textBody: email.textBody,
      cc: email.cc,
      bcc: email.bcc,
      priority: email.priority,
      templateId: email.templateId,
      templateData: email.templateData,
      leadId: email.leadId,
      campaignId: email.campaignId,
      status: email.status,
      createdAt: email.createdAt,
      updatedAt: email.updatedAt,
      sentAt: email.sentAt,
      deliveredAt: email.deliveredAt,
      errorMessage: email.errorMessage,
      sesMessageId: email.sesMessageId,
      retryCount: email.retryCount
    };
  }

  private toDomain(doc: any): Email {
    return new Email(
      doc._id,
      doc.from,
      doc.to,
      doc.subject,
      doc.htmlBody,
      doc.textBody,
      doc.cc,
      doc.bcc,
      doc.priority,
      doc.templateId,
      doc.templateData,
      doc.leadId,
      doc.campaignId,
      doc.status,
      doc.createdAt,
      doc.updatedAt,
      doc.sentAt,
      doc.deliveredAt,
      doc.errorMessage,
      doc.sesMessageId,
      doc.retryCount
    );
  }
}