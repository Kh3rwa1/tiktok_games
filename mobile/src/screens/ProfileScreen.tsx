/**
 * Premium Profile Screen
 * AAA+ Quality TypeScript Implementation
 * Features: User Stats, Edit Profile, Logout, Animated Components
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Modal,
  Dimensions,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

// Stores & Types
import { useAuthStore } from '../store/authStore';
import { useGameStore } from '../store/gameStore';
import { MainTabParamList } from '../types';

// Components
import { PremiumButton, LoadingSkeleton } from '../components';

// Utils
import { triggerMedium, triggerSuccess, triggerWarning } from '../utils/haptics';

const { width } = Dimensions.get('window');

type ProfileScreenNavigationProp = BottomTabNavigationProp<
  MainTabParamList,
  'Profile'
>;

interface Props {
  navigation: ProfileScreenNavigationProp;
}

export default function ProfileScreen({ navigation }: Props) {
  const { user, signOut, updateProfile, isLoading } = useAuthStore();
  const { fetchFavorites, favorites } = useGameStore();
  const insets = useSafeAreaInsets();

  const [showEditModal, setShowEditModal] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Animation values
  const headerScale = useSharedValue(0);
  const statsOpacity = useSharedValue(0);

  useEffect(() => {
    // Load favorites
    fetchFavorites();

    // Entrance animations
    headerScale.value = withSpring(1, {
      damping: 15,
      stiffness: 100,
    });
    statsOpacity.value = withTiming(1, { duration: 800 });
  }, []);

  useEffect(() => {
    if (user) {
      setEditUsername(user.username);
      setEditBio(user.bio || '');
    }
  }, [user]);

  const headerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: headerScale.value }],
  }));

  const statsStyle = useAnimatedStyle(() => ({
    opacity: statsOpacity.value,
  }));

  const handleEditProfile = () => {
    triggerMedium();
    setShowEditModal(true);
  };

  const handleSaveProfile = async () => {
    if (!editUsername.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Username Required',
        text2: 'Please enter a username',
        position: 'top',
        visibilityTime: 3000,
      });
      return;
    }

    if (editUsername.trim().length < 3) {
      Toast.show({
        type: 'error',
        text1: 'Username Too Short',
        text2: 'Username must be at least 3 characters',
        position: 'top',
        visibilityTime: 3000,
      });
      return;
    }

    try {
      setIsUpdating(true);
      triggerMedium();

      await updateProfile({
        username: editUsername.trim(),
        bio: editBio.trim(),
      });

      triggerSuccess();
      Toast.show({
        type: 'success',
        text1: 'Profile Updated',
        text2: 'Your profile has been updated successfully',
        position: 'top',
        visibilityTime: 2000,
      });

      setShowEditModal(false);
    } catch (err) {
      console.error('Error updating profile:', err);
      Toast.show({
        type: 'error',
        text1: 'Update Failed',
        text2: 'Failed to update profile. Please try again.',
        position: 'top',
        visibilityTime: 3000,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLogout = () => {
    triggerWarning();

    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => {},
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              triggerMedium();
              await signOut();

              Toast.show({
                type: 'success',
                text1: 'Logged Out',
                text2: 'You have been logged out successfully',
                position: 'top',
                visibilityTime: 2000,
              });
            } catch (err) {
              console.error('Error logging out:', err);
              Toast.show({
                type: 'error',
                text1: 'Logout Failed',
                text2: 'Failed to logout. Please try again.',
                position: 'top',
                visibilityTime: 3000,
              });
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const formatPlayTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (!user || isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSkeleton variant="profile" count={1} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header Gradient */}
      <LinearGradient
        colors={['#1a0a1a', '#000']}
        style={styles.headerGradient}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingTop: 20 }]}
      >
        {/* Profile Header */}
        <Animated.View style={[styles.header, headerStyle]} entering={FadeIn}>
          <View style={styles.avatarContainer}>
            <LinearGradient
              colors={['#FF0050', '#FF4500']}
              style={styles.avatarGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {user.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatar} />
              ) : (
                <Ionicons name="person" size={60} color="#fff" />
              )}
            </LinearGradient>
            <TouchableOpacity
              style={styles.editIconButton}
              onPress={handleEditProfile}
            >
              <LinearGradient
                colors={['#FF0050', '#FF4500']}
                style={styles.editIconGradient}
              >
                <Ionicons name="pencil" size={16} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <Text style={styles.username}>@{user.username}</Text>
          {user.bio && <Text style={styles.bio}>{user.bio}</Text>}

          {/* TikTok-style Followers/Following Stats */}
          <View style={styles.socialStats}>
            <TouchableOpacity style={styles.socialStatItem}>
              <Text style={styles.socialStatValue}>{user.following_count || 0}</Text>
              <Text style={styles.socialStatLabel}>Following</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialStatItem}>
              <Text style={styles.socialStatValue}>{user.followers_count || 0}</Text>
              <Text style={styles.socialStatLabel}>Followers</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialStatItem}>
              <Text style={styles.socialStatValue}>{favorites.length}</Text>
              <Text style={styles.socialStatLabel}>Likes</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Stats Cards */}
        <Animated.View
          style={[styles.statsContainer, statsStyle]}
          entering={FadeInDown.delay(200)}
        >
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <LinearGradient
                colors={['#1a1a1a', '#0a0a0a']}
                style={styles.statGradient}
              >
                <Ionicons name="game-controller" size={32} color="#FF0050" />
                <Text style={styles.statValue}>
                  {user.total_games_played || 0}
                </Text>
                <Text style={styles.statLabel}>Games Played</Text>
              </LinearGradient>
            </View>

            <View style={styles.statCard}>
              <LinearGradient
                colors={['#1a1a1a', '#0a0a0a']}
                style={styles.statGradient}
              >
                <Ionicons name="time" size={32} color="#FF4500" />
                <Text style={styles.statValue}>
                  {formatPlayTime(user.total_play_time || 0)}
                </Text>
                <Text style={styles.statLabel}>Play Time</Text>
              </LinearGradient>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <LinearGradient
                colors={['#1a1a1a', '#0a0a0a']}
                style={styles.statGradient}
              >
                <Ionicons name="videocam" size={32} color="#FF0050" />
                <Text style={styles.statValue}>{user.games_count || 0}</Text>
                <Text style={styles.statLabel}>Games Created</Text>
              </LinearGradient>
            </View>

            <View style={styles.statCard}>
              <LinearGradient
                colors={['#1a1a1a', '#0a0a0a']}
                style={styles.statGradient}
              >
                <Ionicons name="trophy" size={32} color="#FFD700" />
                <Text style={styles.statValue}>
                  {user.role === 'admin' ? 'Admin' : 'Player'}
                </Text>
                <Text style={styles.statLabel}>Role</Text>
              </LinearGradient>
            </View>
          </View>
        </Animated.View>

        {/* Action Buttons */}
        <Animated.View style={styles.actionsContainer} entering={FadeInDown.delay(400)}>
          <PremiumButton
            title="Edit Profile"
            onPress={handleEditProfile}
            variant="outline"
            size="large"
            icon="pencil"
            style={styles.actionButton}
          />

          <PremiumButton
            title="Logout"
            onPress={handleLogout}
            variant="outline"
            size="large"
            icon="log-out"
            style={styles.logoutButton}
          />
        </Animated.View>

        {/* Account Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>Account Information</Text>

          <View style={styles.infoItem}>
            <Ionicons name="calendar" size={20} color="#666" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Member Since</Text>
              <Text style={styles.infoValue}>
                {user.created_at
                  ? new Date(user.created_at).toLocaleDateString()
                  : user.createdAt?.toDate
                    ? new Date(user.createdAt.toDate()).toLocaleDateString()
                    : 'N/A'}
              </Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <Ionicons name="shield-checkmark" size={20} color="#666" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Account Status</Text>
              <Text style={[styles.infoValue, { color: '#34C759' }]}>
                Active
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowEditModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <Animated.View
            style={styles.modalContent}
            entering={FadeInDown.springify()}
          >
            <LinearGradient
              colors={['#1a1a1a', '#0a0a0a']}
              style={[styles.modalGradient, { paddingBottom: Math.max(insets.bottom, 20) }]}
            >
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Profile</Text>
                <TouchableOpacity
                  onPress={() => setShowEditModal(false)}
                  disabled={isUpdating}
                >
                  <Ionicons name="close" size={28} color="#fff" />
                </TouchableOpacity>
              </View>

              {/* Form Fields */}
              <View style={styles.modalBody}>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Username</Text>
                  <TextInput
                    style={styles.input}
                    value={editUsername}
                    onChangeText={setEditUsername}
                    placeholder="Enter username"
                    placeholderTextColor="#666"
                    autoCapitalize="none"
                    editable={!isUpdating}
                    maxLength={20}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Bio</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={editBio}
                    onChangeText={setEditBio}
                    placeholder="Tell us about yourself"
                    placeholderTextColor="#666"
                    multiline
                    numberOfLines={4}
                    editable={!isUpdating}
                    maxLength={200}
                  />
                  <Text style={styles.charCount}>
                    {editBio.length}/200
                  </Text>
                </View>
              </View>

              {/* Modal Actions */}
              <View style={styles.modalActions}>
                <PremiumButton
                  title="Cancel"
                  onPress={() => setShowEditModal(false)}
                  variant="outline"
                  size="large"
                  disabled={isUpdating}
                  style={styles.modalButton}
                />
                <PremiumButton
                  title={isUpdating ? 'Saving...' : 'Save Changes'}
                  onPress={handleSaveProfile}
                  variant="gradient"
                  size="large"
                  loading={isUpdating}
                  disabled={isUpdating}
                  style={styles.modalButton}
                />
              </View>
            </LinearGradient>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  avatarGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  avatar: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: '#1a1a1a',
  },
  editIconButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderRadius: 18,
    overflow: 'hidden',
  },
  editIconGradient: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  username: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  bio: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  socialStats: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    gap: 40,
  },
  socialStatItem: {
    alignItems: 'center',
  },
  socialStatValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  socialStatLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    marginTop: 4,
  },
  statsContainer: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
  statGradient: {
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 20,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginTop: 12,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  actionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 32,
    gap: 12,
  },
  actionButton: {
    marginBottom: 0,
  },
  logoutButton: {
    marginBottom: 0,
  },
  infoContainer: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  infoTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  modalGradient: {
    paddingTop: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
  },
  modalBody: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 8,
  },
  modalActions: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    marginBottom: 0,
  },
});
