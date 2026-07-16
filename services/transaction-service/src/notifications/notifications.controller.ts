import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';
import { NotificationsService } from './notifications.service';
import { JwtPayload } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(
    private notificationsService: NotificationsService,
    private jwtService: JwtService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List notifications for the authenticated user' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  list(@CurrentUser() user: JwtPayload, @Query('limit') limit?: string) {
    const parsed = limit ? Math.min(Math.max(parseInt(limit, 10) || 30, 1), 100) : 30;
    return this.notificationsService.listForUser(user.sub, parsed);
  }

  @Get('unread-count')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unread notification count' })
  unreadCount(@CurrentUser() user: JwtPayload) {
    return this.notificationsService.countUnread(user.sub).then((count) => ({ count }));
  }

  @Patch('read-all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllRead(@CurrentUser() user: JwtPayload) {
    return this.notificationsService.markAllRead(user.sub);
  }

  @Patch(':id/read')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark a notification as read' })
  markRead(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.notificationsService.markRead(user.sub, id);
  }

  @Get('stream')
  @ApiOperation({ summary: 'SSE stream for real-time notifications' })
  @ApiQuery({ name: 'token', required: true, description: 'JWT access token' })
  stream(@Query('token') token: string, @Res() res: Response) {
    if (!token) {
      throw new UnauthorizedException('Token required');
    }

    let userId: string;
    try {
      const payload = this.jwtService.verify<JwtPayload>(token);
      userId = payload.sub;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const heartbeat = setInterval(() => {
      res.write(': heartbeat\n\n');
    }, 30000);

    const unsubscribe = this.notificationsService.subscribe(userId, (event) => {
      res.write(`event: ${event.type}\n`);
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    });

    res.on('close', () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  }
}
