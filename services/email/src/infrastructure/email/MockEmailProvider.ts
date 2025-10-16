import { Email } from '../../domain/entities/Email';
import { EmailProvider } from '../../domain/services/EmailService';

export class MockEmailProvider implements EmailProvider {
  async sendEmail(email: Email): Promise<string> {
    console.log('Mock: Sending email:', {
      id: email.id,
      from: email.from,
      to: email.to,
      subject: email.subject
    });
    
    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return `mock-ses-${Date.now()}`;
  }
}