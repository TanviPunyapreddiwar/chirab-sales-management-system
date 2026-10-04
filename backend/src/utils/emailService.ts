/**
 * Email service abstraction.
 * Currently logs emails in development. Configure EMAIL_PROVIDER in .env
 * to enable real sending via smtp or sendgrid.
 */

interface EmailOptions {
  to: string | string[];
  subject: string;
  body: string;
  html?: string;
}

class EmailService {
  private provider: string;

  constructor() {
    this.provider = process.env.EMAIL_PROVIDER || 'none';
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    if (this.provider === 'none' || process.env.NODE_ENV === 'development') {
      console.log('📧 [Email Service - DEV MODE] Email would be sent:');
      console.log(`   To: ${Array.isArray(options.to) ? options.to.join(', ') : options.to}`);
      console.log(`   Subject: ${options.subject}`);
      console.log(`   Body: ${options.body.slice(0, 100)}...`);
      return;
    }
    // TODO: Implement real email providers (smtp, sendgrid) when configured
  }

  async sendOfferEmail(to: string, offerNumber: string, customerName: string): Promise<void> {
    await this.sendEmail({
      to,
      subject: `Offer ${offerNumber} - Chirab Technologies`,
      body: `Dear Customer,\n\nPlease find attached our offer ${offerNumber} for ${customerName}.\n\nBest regards,\nChirab Technologies`,
    });
  }

  async sendApprovalNotification(to: string, offerNumber: string, action: string): Promise<void> {
    await this.sendEmail({
      to,
      subject: `Offer ${offerNumber} - Approval ${action}`,
      body: `Offer ${offerNumber} has been ${action.toLowerCase()}.`,
    });
  }

  async sendFollowUpReminder(to: string, offerNumber: string, customerName: string): Promise<void> {
    await this.sendEmail({
      to,
      subject: `Follow-up Due: ${offerNumber} - ${customerName}`,
      body: `Reminder: Follow-up is due for offer ${offerNumber} with ${customerName}.`,
    });
  }

  async sendPasswordReset(to: string, resetToken: string): Promise<void> {
    await this.sendEmail({
      to,
      subject: 'Password Reset - Chirab Sales System',
      body: `Use token ${resetToken} to reset your password. Valid for 1 hour.`,
    });
  }
}

export const emailService = new EmailService();
