import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';

@ApiTags('notifications')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @ApiOperation({ summary: 'Get current user in-app notifications with unread count' })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean })
  @ApiQuery({ name: 'readOnly', required: false, type: Boolean })
  @ApiQuery({ name: 'filter', required: false, enum: ['all', 'unread', 'read'] })
  @ApiQuery({ name: 'status', required: false, enum: ['all', 'unread', 'read'] })
  @ApiQuery({ name: 'isRead', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Notifications list retrieved' })
  @Get()
  async getUserNotifications(
    @CurrentUser() user: RequestUser,
    @Query() query: NotificationQueryDto,
  ) {
    let filterMode: 'all' | 'unread' | 'read' = 'all';

    if (
      query.filter === 'unread' ||
      query.status === 'unread' ||
      query.unreadOnly === true ||
      query.isRead === false
    ) {
      filterMode = 'unread';
    } else if (
      query.filter === 'read' ||
      query.status === 'read' ||
      query.readOnly === true ||
      query.isRead === true
    ) {
      filterMode = 'read';
    }

    return this.notificationsService.getUserNotifications(
      user.id,
      query,
      filterMode,
    );
  }

  @ApiOperation({ summary: 'Mark specific notification as read' })
  @ApiResponse({ status: 200, description: 'Notification updated' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  @Patch(':id/read')
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.notificationsService.markAsRead(id, user.id);
  }

  @ApiOperation({ summary: 'Mark specific notification as unread' })
  @ApiResponse({ status: 200, description: 'Notification updated' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  @Patch(':id/unread')
  async markAsUnread(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.notificationsService.markAsUnread(id, user.id);
  }

  @ApiOperation({ summary: 'Mark all notifications as read for current user' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  @Patch('read-all')
  async markAllAsRead(@CurrentUser() user: RequestUser) {
    return this.notificationsService.markAllAsRead(user.id);
  }
}
