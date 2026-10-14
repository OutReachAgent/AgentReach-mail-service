import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DeliveryService } from './delivery/delivery.service';
import { HealthController } from './health/health.controller';
import { InternalController } from './internal/internal.controller';
import { MessagesModule } from './messages/messages.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MessagesModule,
  ],
  controllers: [HealthController, InternalController],
  providers: [DeliveryService],
})
export class AppModule {}

