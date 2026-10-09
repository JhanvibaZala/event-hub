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
    create: jest.Mock;
  };

  beforeEach(async () => {
    notificationModel = {
      findAndCountAll: jest.fn(),
      count: jest.fn(),
      findByPk: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
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

  describe('getUserNotifications (Inbox Read/Unread Filters)', () => {
    it('should return all notifications (both read and unread) when filter is "all"', async () => {
      notificationModel.findAndCountAll.mockResolvedValue({
        count: 2,
        rows: [
          { id: 'notif-1', title: 'Ticket Confirmed', isRead: false },
          { id: 'notif-2', title: 'Event Reminder', isRead: true },
        ],
      });
      notificationModel.count.mockResolvedValue(1);

      const query = Object.assign(new PaginationQueryDto(), { page: 1, limit: 10 });
      const result = await service.getUserNotifications('u1', query, 'all');

      expect(result.items).toHaveLength(2);
      expect(result.unreadCount).toBe(1);
      expect(result.meta.total).toBe(2);
      expect(notificationModel.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'u1' },
        }),
      );
    });

    it('should return only unread notifications when filter is "unread" or unreadOnly=true', async () => {
      notificationModel.findAndCountAll.mockResolvedValue({
        count: 1,
        rows: [{ id: 'notif-1', title: 'Ticket Confirmed', isRead: false }],
      });
      notificationModel.count.mockResolvedValue(1);

      const query = Object.assign(new PaginationQueryDto(), { page: 1, limit: 10 });
      const result = await service.getUserNotifications('u1', query, 'unread');

      expect(result.items).toHaveLength(1);
      expect(result.items[0].isRead).toBe(false);
      expect(result.unreadCount).toBe(1);
      expect(result.meta.total).toBe(1);
      expect(notificationModel.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'u1', isRead: false },
        }),
      );
    });

    it('should return only read notifications when filter is "read"', async () => {
      notificationModel.findAndCountAll.mockResolvedValue({
        count: 1,
        rows: [{ id: 'notif-2', title: 'Event Reminder', isRead: true }],
      });
      notificationModel.count.mockResolvedValue(1);

      const query = Object.assign(new PaginationQueryDto(), { page: 1, limit: 10 });
      const result = await service.getUserNotifications('u1', query, 'read');

      expect(result.items).toHaveLength(1);
      expect(result.items[0].isRead).toBe(true);
      expect(result.unreadCount).toBe(1);
      expect(result.meta.total).toBe(1);
      expect(notificationModel.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'u1', isRead: true },
        }),
      );
    });

    it('should keep unreadCount accurate across any active filter', async () => {
      notificationModel.findAndCountAll.mockResolvedValue({
        count: 5,
        rows: [],
      });
      notificationModel.count.mockResolvedValue(3); // 3 total unread notifications

      const query = Object.assign(new PaginationQueryDto(), { page: 1, limit: 10 });
      const result = await service.getUserNotifications('u1', query, 'read');

      expect(result.unreadCount).toBe(3);
      expect(notificationModel.count).toHaveBeenCalledWith({
        where: { userId: 'u1', isRead: false },
      });
    });
  });

  describe('markAsRead', () => {
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
  });

  describe('markAsUnread', () => {
    it('should throw NotFoundException if notification does not exist when marking as unread', async () => {
      notificationModel.findByPk.mockResolvedValue(null);

      await expect(service.markAsUnread('missing', 'u1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user tries to mark another user notification as unread', async () => {
      notificationModel.findByPk.mockResolvedValue({
        id: 'notif-1',
        userId: 'other-user',
      });

      await expect(service.markAsUnread('notif-1', 'u1')).rejects.toThrow(ForbiddenException);
    });

    it('should mark notification as unread when owned by user', async () => {
      const mockNotif = {
        id: 'notif-1',
        userId: 'u1',
        isRead: true,
        update: jest.fn().mockResolvedValue(true),
      };
      notificationModel.findByPk.mockResolvedValue(mockNotif);

      const result = await service.markAsUnread('notif-1', 'u1');
      expect(mockNotif.update).toHaveBeenCalledWith({ isRead: false });
      expect(result.id).toBe('notif-1');
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read for a user', async () => {
      notificationModel.update.mockResolvedValue([3]);

      const result = await service.markAllAsRead('u1');
      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(3);
    });
  });

  describe('createNotification', () => {
    it('should create an unread notification with proper fields', async () => {
      const mockCreated = {
        id: 'notif-new',
        userId: 'admin-1',
        title: 'New Event Registration',
        message: 'A user has registered for Tech Summit.',
        isRead: false,
      };
      notificationModel.create = jest.fn().mockResolvedValue(mockCreated);

      const result = await service.createNotification({
        userId: 'admin-1',
        title: 'New Event Registration',
        message: 'A user has registered for Tech Summit.',
      });

      expect(notificationModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'admin-1',
          title: 'New Event Registration',
          isRead: false,
        }),
      );
      expect(result.id).toBe('notif-new');
    });
  });
});
