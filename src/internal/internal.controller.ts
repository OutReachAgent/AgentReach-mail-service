import {
  Body,
  Controller,
  Headers,
  UnauthorizedException,
  Post,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SubmitMessageDto } from '../messages/message.dto';
import { MessagesService } from '../messages/messages.service';
import { hasValidInternalSecret } from './internal-auth';

@Controller('internal')
export class InternalController {
  constructor(
    private readonly config: ConfigService,
    private readonly messages: MessagesService,
  ) {}

  @Post('messages')
  submitMessage(
    @Headers('x-internal-mail-secret') suppliedSecret: string | undefined,
    @Body() message: SubmitMessageDto,
  ) {
    const configuredSecret = this.config.get<string>('INTERNAL_API_SECRET');
    if (!hasValidInternalSecret(configuredSecret, suppliedSecret)) {
      throw new UnauthorizedException('Invalid internal mail-service secret');
    }

    return this.messages.submit(message);
  }
}

