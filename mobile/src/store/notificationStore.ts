/**
 * Notification Store - In-App Notifications Management
 * Uses server API for notification fetching and read tracking
 */

import { create } from 'zustand';
import { Notification, NotificationState } from '../types';
import api from '../services/api';

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,

  fetchNotifications: async () => {
    try {
      set({ isLoading: true, error: null });

      const notifications = await api.getNotifications();

      // Transform and sort by priority (higher first), then by date (newest first)
      const sortedNotifications = notifications
        .map((n: any) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          type: n.type || 'info',
          target_role: n.target_role || 'all',
          priority: n.priority || 0,
          start_date: n.start_date,
          end_date: n.end_date,
          is_active: n.is_active !== false,
          created_at: n.created_at,
          updated_at: n.updated_at,
          is_read: Boolean(n.is_read),
        }))
        .sort((a: Notification, b: Notification) => {
          // Sort by priority first (higher = first)
          if (b.priority !== a.priority) {
            return b.priority - a.priority;
          }
          // Then by date (newest first)
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

      const unreadCount = sortedNotifications.filter((n: Notification) => !n.is_read).length;

      set({
        notifications: sortedNotifications,
        unreadCount,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      console.error('Fetch notifications error:', error);
      set({
        error: error.message || 'Failed to fetch notifications',
        isLoading: false,
      });
    }
  },

  markAsRead: async (id: number) => {
    try {
      await api.markNotificationRead(id);

      // Update local state
      const { notifications } = get();
      const updatedNotifications = notifications.map((n) =>
        n.id === id ? { ...n, is_read: true } : n
      );
      const unreadCount = updatedNotifications.filter((n) => !n.is_read).length;

      set({
        notifications: updatedNotifications,
        unreadCount,
      });
    } catch (error: any) {
      console.error('Mark notification read error:', error);
      set({ error: error.message || 'Failed to mark notification as read' });
    }
  },

  markAllAsRead: async () => {
    try {
      const { notifications } = get();
      const unreadNotifications = notifications.filter((n) => !n.is_read);

      // Mark all unread notifications as read
      await Promise.all(
        unreadNotifications.map((n) => api.markNotificationRead(n.id))
      );

      // Update local state
      const updatedNotifications = notifications.map((n) => ({
        ...n,
        is_read: true,
      }));

      set({
        notifications: updatedNotifications,
        unreadCount: 0,
      });
    } catch (error: any) {
      console.error('Mark all notifications read error:', error);
      set({ error: error.message || 'Failed to mark all notifications as read' });
    }
  },
}));
