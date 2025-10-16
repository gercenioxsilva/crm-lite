import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { Email } from '../../domain/entities/Email';
import { EmailProvider } from '../../domain/services/EmailService';

export class SESEmailProvider implements EmailProvider {
  private sesClient: SESClient;

  constructor(region: string = 'us-east-1') {
    this.sesClient = new SESClient({ region });
  }

  async sendEmail(email: Email): Promise<string> {
    const command = new SendEmailCommand({
      Source: this.formatEmailAddress(email.from),
      Destination: {
        ToAddresses: email.to.map(addr => this.formatEmailAddress(addr)),
        CcAddresses: email.cc?.map(addr => this.formatEmailAddress(addr)),
        BccAddresses: email.bcc?.map(addr => this.formatEmailAddress(addr))
      },
      Message: {
        Subject: {
          Data: email.subject,
          Charset: 'UTF-8'
        },
        Body: {
          Html: {
            Data: email.htmlBody,
            Charset: 'UTF-8'
          },
          Text: email.textBody ? {
            Data: email.textBody,
            Charset: 'UTF-8'
          } : undefined
        }
      },
      Tags: [
        { Name: 'EmailId', Value: email.id },
        { Name: 'Priority', Value: email.priority },
        ...(email.leadId ? [{ Name: 'LeadId', Value: email.leadId }] : []),
        ...(email.campaignId ? [{ Name: 'CampaignId', Value: email.campaignId }] : [])
      ]
    });

    const response = await this.sesClient.send(command);
    return response.MessageId!;
  }

  private formatEmailAddress(addr: { email: string; name?: string }): string {
    return addr.name ? `${addr.name} <${addr.email}>` : addr.email;
  }
}