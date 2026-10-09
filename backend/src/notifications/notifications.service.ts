import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Notification, NotificationType } from './models/notification.model';
import { PaginationQueryDto, PaginatedResult } from '../common/dto/pagination-query.dto';

export interface NotificationsResult extends PaginatedResult<Notification> {
  unreadCount: number;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification)
    private readonly notificationModel: typeof Notification,
  ) {}

  async getUserNotifications(
    userId: string,
    query: PaginationQueryDto,
    filterOrUnreadOnly: 'all' | 'unread' | 'read' | boolean = 'all',
  ): Promise<NotificationsResult> {
    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 10, 100);
    const offset = (page - 1) * limit;

    let filterMode: 'all' | 'unread' | 'read' = 'all';
    if (typeof filterOrUnreadOnly === 'boolean') {
      filterMode = filterOrUnreadOnly ? 'unread' : 'all';
    } else if (
      filterOrUnreadOnly === 'unread' ||
      filterOrUnreadOnly === 'read' ||
      filterOrUnreadOnly === 'all'
    ) {
      filterMode = filterOrUnreadOnly;
    }

    const whereClause: any = { userId };
    if (filterMode === 'unread') {
      whereClause.isRead = false;
    } else if (filterMode === 'read') {
      whereClause.isRead = true;
    }

    const [{ count, rows }, unreadCount] = await Promise.all([
      this.notificationModel.findAndCountAll({
        where: whereClause,
        limit,
        offset,
        order: [['created_at', 'DESC']],
      }),
      this.notificationModel.count({
        where: { userId, isRead: false },
      }),
    ]);

    const totalPages = Math.ceil(count / limit) || 1;

    return {
      items: rows,
      unreadCount,
      meta: {
        total: count,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  async markAsRead(id: string, userId: string): Promise<Notification> {
    const notification = await this.notificationModel.findByPk(id);
    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException(
        'You can only mark your own notifications as read',
      );
    }

    await notification.update({ isRead: true });
    return notification;
  }

  async markAsUnread(id: string, userId: string): Promise<Notification> {
    const notification = await this.notificationModel.findByPk(id);
    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException(
        'You can only mark your own notifications as unread',
      );
    }

    await notification.update({ isRead: false });
    return notification;
  }

  async markAllAsRead(
    userId: string,
  ): Promise<{ success: boolean; updatedCount: number }> {
    const [updatedCount] = await this.notificationModel.update(
      { isRead: true },
      { where: { userId, isRead: false } },
    );

    return { success: true, updatedCount };
  }

  async createNotification(data: {
    userId: string;
    title: string;
    message: string;
    type?: NotificationType;
    metadata?: Record<string, any>;
  }): Promise<Notification> {
    return this.notificationModel.create({
      userId: data.userId,
      title: data.title,
      message: data.message,
      type: data.type || 'REGISTRATION',
      isRead: false,
      metadata: data.metadata || null,
    });
  }
}
