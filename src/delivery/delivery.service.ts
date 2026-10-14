import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type SentMessageInfo, type Transporter } from 'nodemailer';
import type { SubmitMessageDto } from '../messages/message.dto';

const RETRYABLE_CODES = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'EAI_AGAIN',
  'ESOCKET',
]);

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);
  private readonly smtpHost: string;
  private readonly smtpName: string;
  private readonly smtpPort: number;
  private readonly smtpSecure: boolean;
  private readonly smtpRequireTls: boolean;
  private readonly smtpUser: string;
  private readonly smtpPassword: string;
  private readonly tlsRejectUnauthorized: boolean;
  private readonly maxAttempts: number;
  private readonly transport: Transporter<SentMessageInfo> | null;

  constructor(private readonly config: ConfigService) {
    this.smtpHost = this.config.get<string>('SMTP_HOST')?.trim() || '';
    this.smtpName =
      this.config.get<string>('SMTP_HELO_NAME')?.trim() ||
      this.config.get<string>('MAIL_HOSTNAME')?.trim() || '';
    this.smtpPort = this.numberSetting('SMTP_PORT', 25);
    this.smtpSecure = this.booleanSetting('SMTP_SECURE', false);
    this.smtpRequireTls = this.booleanSetting('SMTP_REQUIRE_TLS', false);
    this.smtpUser = this.config.get<string>('SMTP_USER')?.trim() || '';
    this.smtpPassword = this.config.get<string>('SMTP_PASSWORD') || '';
    this.tlsRejectUnauthorized = this.booleanSetting(
      'SMTP_TLS_REJECT_UNAUTHORIZED',
      true,
    );
    this.maxAttempts = Math.max(1, this.numberSetting('SMTP_MAX_ATTEMPTS', 3));

    this.transport = this.smtpHost
      ? nodemailer.createTransport({
          host: this.smtpHost,
          ...(this.smtpName ? { name: this.smtpName } : {}),
          port: this.smtpPort,
          secure: this.smtpSecure,
          requireTLS: this.smtpRequireTls,
          ...(this.smtpUser || this.smtpPassword
            ? { auth: { user: this.smtpUser, pass: this.smtpPassword } }
            : {}),
          connectionTimeout: this.numberSetting(
            'SMTP_CONNECTION_TIMEOUT_MS',
            10000,
          ),
          greetingTimeout: this.numberSetting('SMTP_GREETING_TIMEOUT_MS', 10000),
          socketTimeout: this.numberSetting('SMTP_SOCKET_TIMEOUT_MS', 30000),
          tls: { rejectUnauthorized: this.tlsRejectUnauthorized },
        })
      : null;
  }

  isConfigured() {
    return Boolean(this.transport);
  }

  configuration() {
    return {
      configured: this.isConfigured(),
      host: this.smtpHost || null,
      port: this.smtpPort,
      secure: this.smtpSecure,
      authenticated: Boolean(this.smtpUser || this.smtpPassword),
    };
  }

  async deliver(message: SubmitMessageDto) {
    if (!this.transport) {
      throw new ServiceUnavailableException(
        'SMTP delivery is not configured. Set SMTP_HOST and SMTP_PORT for the mail service.',
      );
    }

    const result = await this.sendWithRetry(message);
    return {
      messageId: result.messageId,
      accepted: result.accepted || [],
      rejected: result.rejected || [],
      attempts: result.attempts,
    };
  }

  private async sendWithRetry(message: SubmitMessageDto) {
    let lastError: unknown;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      try {
        const info = await this.transport!.sendMail({
          from: message.from,
          to: message.to,
          cc: message.cc,
          bcc: message.bcc,
          replyTo: message.replyTo,
          subject: message.subject,
          text: message.text,
          html: message.html,
          attachments: message.attachments?.map((attachment) => ({
            filename: attachment.name,
            contentType: attachment.contentType,
            content: Buffer.from(attachment.contentBase64, 'base64'),
          })),
        });

        if (info.rejected?.length && !info.accepted?.length) {
          throw new Error(
            `SMTP rejected all recipients: ${info.rejected.join(', ')}`,
          );
        }

        return { ...info, attempts: attempt };
      } catch (error: unknown) {
        lastError = error;
        if (attempt >= this.maxAttempts || !this.isRetryable(error)) break;

        const delayMs = 500 * 2 ** (attempt - 1);
        const details = this.errorDetails(error);
        const errorMessage =
          typeof details.message === 'string'
            ? details.message
            : 'unknown error';
        this.logger.warn(
          `SMTP delivery attempt ${attempt} failed; retrying in ${delayMs}ms: ${errorMessage}`,
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error('SMTP delivery failed.');
  }

  private isRetryable(error: unknown) {
    const details = this.errorDetails(error);
    const code =
      typeof details.code === 'string' ? details.code.toUpperCase() : '';
    const responseCode = Number(details.responseCode || 0);
    return RETRYABLE_CODES.has(code) || (responseCode >= 400 && responseCode < 500);
  }

  private errorDetails(error: unknown) {
    if (!error || typeof error !== 'object') return {};
    return error as {
      code?: unknown;
      responseCode?: unknown;
      message?: unknown;
    };
  }

  private numberSetting(name: string, fallback: number) {
    const value = Number(this.config.get<string>(name));
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }

  private booleanSetting(name: string, fallback: boolean) {
    const value = this.config.get<string>(name)?.trim().toLowerCase();
    if (!value) return fallback;
    return value === 'true' || value === '1' || value === 'yes';
  }
}
