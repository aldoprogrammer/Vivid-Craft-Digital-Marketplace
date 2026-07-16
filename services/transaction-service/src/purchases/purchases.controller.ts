import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';
import { PurchasesService } from './purchases.service';

@ApiTags('Purchases')
@Controller('purchases')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PurchasesController {
  constructor(private purchasesService: PurchasesService) {}

  @Get()
  @ApiOperation({ summary: 'List paid digital goods owned by the current user' })
  list(@CurrentUser() user: JwtPayload) {
    return this.purchasesService.findByUser(user.sub);
  }

  @Get('owned-ids')
  @ApiOperation({ summary: 'List product IDs owned or already in checkout by the current user' })
  ownedIds(@CurrentUser() user: JwtPayload) {
    return this.purchasesService.findOwnedProductIds(user.sub);
  }

  @Get(':token/download')
  @ApiOperation({ summary: 'Download purchased digital asset or license file' })
  async download(
    @Param('token') token: string,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ) {
    const result = await this.purchasesService.download(token, user.sub, user.role);

    if (result.kind === 'asset') {
      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.send(result.buffer);
      return;
    }

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.body);
  }
}
