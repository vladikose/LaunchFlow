import { getConfig, type AppConfig } from "@shared/config";

export interface EmailProvider {
  sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }>;
}

class ResendProvider implements EmailProvider {
  private apiKey: string;
  private fromEmail: string;

  constructor(apiKey: string, fromEmail: string) {
    this.apiKey = apiKey;
    this.fromEmail = fromEmail;
  }

  async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(this.apiKey);
      
      const result = await resend.emails.send({
        from: this.fromEmail,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
      
      if (result.error) {
        return { success: false, error: result.error.message };
      }
      
      return { success: true, messageId: result.data?.id };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

class SMTPProvider implements EmailProvider {
  private host: string;
  private port: number;
  private user: string;
  private password: string;
  private fromEmail: string;

  constructor(host: string, port: number, user: string, password: string, fromEmail: string) {
    this.host = host;
    this.port = port;
    this.user = user;
    this.password = password;
    this.fromEmail = fromEmail;
  }

  async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const nodemailer = await import("nodemailer");
      
      const transporter = nodemailer.default.createTransport({
        host: this.host,
        port: this.port,
        secure: this.port === 465,
        auth: {
          user: this.user,
          pass: this.password,
        },
      });
      
      const result = await transporter.sendMail({
        from: this.fromEmail,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
      
      return { success: true, messageId: result.messageId };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

class NoOpEmailProvider implements EmailProvider {
  async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    console.log(`[Email disabled] Would send to ${options.to}: ${options.subject}`);
    return { success: true, messageId: "noop" };
  }
}

let emailProvider: EmailProvider | null = null;

export function createEmailProvider(config: AppConfig): EmailProvider {
  switch (config.email.provider) {
    case "resend":
      if (!config.email.resendApiKey) {
        console.warn("Resend API key not configured, email disabled");
        return new NoOpEmailProvider();
      }
      return new ResendProvider(
        config.email.resendApiKey,
        config.email.fromEmail || "noreply@example.com"
      );
    
    case "smtp":
      if (!config.email.smtpHost || !config.email.smtpUser || !config.email.smtpPassword) {
        console.warn("SMTP not fully configured, email disabled");
        return new NoOpEmailProvider();
      }
      return new SMTPProvider(
        config.email.smtpHost,
        config.email.smtpPort || 587,
        config.email.smtpUser,
        config.email.smtpPassword,
        config.email.fromEmail || config.email.smtpUser
      );
    
    case "none":
    default:
      return new NoOpEmailProvider();
  }
}

export function getEmailProvider(): EmailProvider {
  if (!emailProvider) {
    const config = getConfig();
    emailProvider = createEmailProvider(config);
  }
  return emailProvider;
}

export function resetEmailProvider(): void {
  emailProvider = null;
}

export async function sendPasswordResetEmail(
  email: string,
  resetCode: string,
  userName?: string
): Promise<{ success: boolean; error?: string }> {
  const provider = getEmailProvider();
  
  return provider.sendEmail({
    to: email,
    subject: "Сброс пароля / Password Reset",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Сброс пароля</h2>
        <p>Здравствуйте${userName ? `, ${userName}` : ""}!</p>
        <p>Вы запросили сброс пароля. Ваш код подтверждения:</p>
        <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0;">
          ${resetCode}
        </div>
        <p>Код действителен в течение 1 часа.</p>
        <p>Если вы не запрашивали сброс пароля, проигнорируйте это письмо.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
        <h2>Password Reset</h2>
        <p>Hello${userName ? `, ${userName}` : ""}!</p>
        <p>You requested a password reset. Your verification code is:</p>
        <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0;">
          ${resetCode}
        </div>
        <p>This code is valid for 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      </div>
    `,
    text: `Password Reset Code: ${resetCode}. Valid for 1 hour.`,
  });
}
