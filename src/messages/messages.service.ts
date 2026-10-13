import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { SubmitMessageDto } from './message.dto';

@Injectable()
export class MessagesService {
  constructor(private readonly config: ConfigService) {}

  submit(message: SubmitMessageDto) {
    if (this.config.get<string>('MAIL_ACCEPT_SUBMISSIONS') !== 'true') {
      throw new ServiceUnavailableException(
        'Mail delivery submissions are not enabled yet.',
      );
    }

    // This is deliberately only a contract stub. A durable queue and MTA
    // worker must be implemented before enabling submissions in production.
    return {
      messageId: randomUUID(),
      idempotencyKey: message.idempotencyKey,
      status: 'QUEUED',
    };
  }
}

