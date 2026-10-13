import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health/health.controller';
import { InternalController } from './internal/internal.controller';
import { MessagesModule } from './messages/messages.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MessagesModule,
  ],
  controllers: [HealthController, InternalController],
})
export class AppModule {}

