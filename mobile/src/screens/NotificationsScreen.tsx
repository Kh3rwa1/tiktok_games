/**
 * Notifications Screen - In-App Notifications Display
 * Premium dark theme with smooth animations
 */

import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  FadeInUp,
  ZoomIn,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import type { StackNavigationProp } from '@react-navigation/stack';

import { useNotificationStore } from '../store/notificationStore';
import { RootStackParamList, Notification } from '../types';
import { LoadingSkeleton } from '../components';
import { triggerMedium, triggerLight, triggerSuccess } from '../utils/haptics';

type NotificationsScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Notifications'
>;

interface Props {
  navigation: NotificationsScreenNavigationProp;
}

// Get icon for notification type
const getNotificationIcon = (type: string): keyof typeof Ionicons.glyphMap => {
  switch (type) {
    case 'success':
      return 'checkmark-circle';
    case 'warning':
      return 'warning';
    case 'error':
      return 'alert-circle';
    case 'promotion':
      return 'gift';
    case 'info':
    default:
      return 'information-circle';
  }
};

// Get color for notification type
const getNotificationColor = (type: string): string => {
  switch (type) {
    case 'success':
      return '#00C853';
    case 'warning':
      return '#FFB300';
    case 'error':
      return '#FF1744';
    case 'promotion':
      return '#FF0050';
    case 'info':
    default:
      return '#2196F3';
  }
};

// Format date for display
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

// Notification Item Component
const NotificationItem = React.memo(({
  item,
  index,
  onPress,
}: {
  item: Notification;
  index: number;
  onPress: (notification: Notification) => void;
}) => {
  const iconName = getNotificationIcon(item.type);
  const iconColor = getNotificationColor(item.type);

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 50).springify()}
    >
      <TouchableOpacity
        style={[
          styles.notificationItem,
          !item.is_read && styles.notificationItemUnread,
        ]}
        onPress={() => onPress(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: `${iconColor}20` }]}>
          <Ionicons name={iconName} size={24} color={iconColor} />
        </View>

        <View style={styles.contentContainer}>
          <View style={styles.headerRow}>
            <Text style={styles.title} numberOfLines={1}>
              {item.title}
            </Text>
            {!item.is_read && <View style={styles.unreadDot} />}
          </View>

          <Text style={styles.message} numberOfLines={2}>
            {item.message}
          </Text>

          <Text style={styles.timestamp}>
            {formatDate(item.created_at)}
          </Text>
        </View>

        <Ionicons
          name="chevron-forward"
          size={20}
          color="#666"
          style={styles.chevron}
        />
      </TouchableOpacity>
    </Animated.View>
  );
});

export default function NotificationsScreen({ navigation }: Props) {
  const {
    notifications,
    unreadCount,
    isLoading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotificationStore();
  const [refreshing, setRefreshing] = React.useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    triggerMedium();

    try {
      await fetchNotifications();
      triggerSuccess();
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to refresh notifications',
        position: 'top',
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleNotificationPress = useCallback(async (notification: Notification) => {
    triggerLight();

    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    // Could navigate to relevant content based on notification type
    Toast.show({
      type: notification.type === 'error' ? 'error' : notification.type === 'warning' ? 'info' : 'success',
      text1: notification.title,
      text2: notification.message,
      position: 'top',
      visibilityTime: 3000,
    });
  }, [markAsRead]);

  const handleMarkAllRead = useCallback(async () => {
    if (unreadCount === 0) return;

    triggerMedium();
    await markAllAsRead();

    Toast.show({
      type: 'success',
      text1: 'Done',
      text2: 'All notifications marked as read',
      position: 'top',
      visibilityTime: 2000,
    });
  }, [unreadCount, markAllAsRead]);

  const renderItem = useCallback(
    ({ item, index }: { item: Notification; index: number }) => (
      <NotificationItem
        item={item}
        index={index}
        onPress={handleNotificationPress}
      />
    ),
    [handleNotificationPress]
  );

  const renderEmpty = () => {
    if (isLoading) {
      return (
        <View style={styles.emptyContainer}>
          <LoadingSkeleton variant="list" count={5} />
        </View>
      );
    }

    return (
      <Animated.View
        style={styles.emptyContainer}
        entering={ZoomIn.springify()}
      >
        <Animated.View entering={FadeInDown.delay(100)}>
          <Ionicons name="notifications-off-outline" size={80} color="#333" />
        </Animated.View>
        <Animated.Text
          style={styles.emptyTitle}
          entering={FadeInDown.delay(200)}
        >
          No Notifications
        </Animated.Text>
        <Animated.Text
          style={styles.emptySubtitle}
          entering={FadeInDown.delay(300)}
        >
          You're all caught up! Check back later for updates.
        </Animated.Text>
        <Animated.View entering={FadeInUp.delay(400).springify()}>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={onRefresh}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#FF0050', '#FF4500']}
              style={styles.retryGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="refresh" size={20} color="#fff" />
              <Text style={styles.retryText}>Refresh</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    );
  };

  const keyExtractor = useCallback((item: Notification) => String(item.id), []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Notifications</Text>

        {unreadCount > 0 && (
          <TouchableOpacity
            style={styles.markAllButton}
            onPress={handleMarkAllRead}
            activeOpacity={0.7}
          >
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Notification List */}
      <FlatList
        data={notifications}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={[
          styles.listContainer,
          notifications.length === 0 && styles.emptyList,
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FF0050"
            colors={['#FF0050']}
            progressBackgroundColor="#1a1a1a"
          />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  markAllButton: {
    padding: 8,
  },
  markAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF0050',
  },
  listContainer: {
    padding: 16,
  },
  emptyList: {
    flex: 1,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
  },
  notificationItemUnread: {
    backgroundColor: '#1a1a1a',
    borderLeftWidth: 3,
    borderLeftColor: '#FF0050',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF0050',
    marginLeft: 8,
  },
  message: {
    fontSize: 14,
    color: '#999',
    lineHeight: 20,
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
  },
  chevron: {
    marginLeft: 8,
  },
  separator: {
    height: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  retryButton: {
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#FF0050',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  retryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    gap: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
