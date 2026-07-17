import {
  Controller,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PaymentDlqService } from './payment-dlq.service';

@ApiTags('Payments')
@Controller('payments/dlq')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PaymentDlqController {
  constructor(private dlqService: PaymentDlqService) {}

  @Post(':jobId/replay')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Replay a failed payment job from the DLQ (ADMIN)' })
  async replay(@Param('jobId') jobId: string) {
    const result = await this.dlqService.replay(jobId);
    if (!result) {
      throw new NotFoundException('DLQ job not found');
    }
    return result;
  }
}
