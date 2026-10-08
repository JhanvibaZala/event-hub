import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { NotificationsService } from './notifications.service';
import { Notification } from './models/notification.model';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let notificationModel: {
    findAndCountAll: jest.Mock;
    count: jest.Mock;
    findByPk: jest.Mock;
    update: jest.Mock;
  };

  beforeEach(async () => {
    notificationModel = {
      findAndCountAll: jest.fn(),
      count: jest.fn(),
      findByPk: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getModelToken(Notification),
          useValue: notificationModel,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  it('should return user notifications and unread badge count', async () => {
    notificationModel.findAndCountAll.mockResolvedValue({
      count: 2,
      rows: [
        { id: 'notif-1', title: 'Ticket Confirmed', isRead: false },
        { id: 'notif-2', title: 'Event Reminder', isRead: true },
      ],
    });
    notificationModel.count.mockResolvedValue(1);

    const query = Object.assign(new PaginationQueryDto(), { page: 1, limit: 10 });
    const result = await service.getUserNotifications('u1', query);

    expect(result.items).toHaveLength(2);
    expect(result.unreadCount).toBe(1);
    expect(result.meta.total).toBe(2);
  });

  it('should throw NotFoundException if notification does not exist when marking as read', async () => {
    notificationModel.findByPk.mockResolvedValue(null);

    await expect(service.markAsRead('missing', 'u1')).rejects.toThrow(NotFoundException);
  });

  it('should throw ForbiddenException if user tries to mark another user notification as read', async () => {
    notificationModel.findByPk.mockResolvedValue({
      id: 'notif-1',
      userId: 'other-user',
    });

    await expect(service.markAsRead('notif-1', 'u1')).rejects.toThrow(ForbiddenException);
  });

  it('should mark notification as read when owned by user', async () => {
    const mockNotif = {
      id: 'notif-1',
      userId: 'u1',
      isRead: false,
      update: jest.fn().mockResolvedValue(true),
    };
    notificationModel.findByPk.mockResolvedValue(mockNotif);

    const result = await service.markAsRead('notif-1', 'u1');
    expect(mockNotif.update).toHaveBeenCalledWith({ isRead: true });
    expect(result.id).toBe('notif-1');
  });

  it('should mark all notifications as read for a user', async () => {
    notificationModel.update.mockResolvedValue([3]);

    const result = await service.markAllAsRead('u1');
    expect(result.success).toBe(true);
    expect(result.updatedCount).toBe(3);
  });
});
