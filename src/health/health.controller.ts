import { Controller, Get } from '@nestjs/common';
import { DeliveryService } from '../delivery/delivery.service';

@Controller('health')
export class HealthController {
  constructor(private readonly delivery: DeliveryService) {}

  @Get()
  health() {
    return {
      service: 'agentreach-mail-service',
      status: 'ok',
      delivery: this.delivery.configuration(),
    };
  }
}

