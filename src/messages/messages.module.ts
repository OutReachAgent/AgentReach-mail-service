import { Module } from '@nestjs/common';
import { DeliveryService } from '../delivery/delivery.service';
import { MessagesService } from './messages.service';

@Module({
  providers: [DeliveryService, MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}

