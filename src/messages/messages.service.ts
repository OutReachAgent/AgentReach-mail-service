import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { DeliveryService } from '../delivery/delivery.service';
import { SubmitMessageDto } from './message.dto';

@Injectable()
export class MessagesService {
  private readonly completed = new Map<
    string,
    { messageId: string; idempotencyKey: string; status: string }
  >();

  constructor(
    private readonly config: ConfigService,
    private readonly delivery: DeliveryService,
  ) {}

  async submit(message: SubmitMessageDto) {
    if (this.config.get<string>('MAIL_ACCEPT_SUBMISSIONS') !== 'true') {
      throw new ServiceUnavailableException(
        'Mail delivery submissions are disabled. Set MAIL_ACCEPT_SUBMISSIONS=true after configuring SMTP.',
      );
    }

    const previous = this.completed.get(message.idempotencyKey);
    if (previous) return previous;

    const delivery = await this.delivery.deliver(message);
    const result = {
      messageId: delivery.messageId || randomUUID(),
      idempotencyKey: message.idempotencyKey,
      status: 'SENT',
    };
    this.completed.set(message.idempotencyKey, result);

    // Keep the in-process idempotency cache bounded until the durable message
    // store is added. A restart intentionally clears this cache.
    if (this.completed.size > 10000) {
      const oldest = this.completed.keys().next().value;
      if (oldest) this.completed.delete(oldest);
    }

    return result;
  }
}

