import { Router } from 'express';
import {
  getMyNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../controllers/notificationController.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

// All notification routes require authentication
router.use(authenticate);

// Unread count
router.get('/unread-count', getUnreadCount);

// Mark all notifications as read
router.post('/read-all', markAllNotificationsAsRead);

// List notifications for current user
router.get('/', getMyNotifications);

// Mark single notification as read
router.patch('/:id/read', markNotificationAsRead);

export default router;
