import React, { useEffect } from 'react';
import {
  StyleSheet,
  View,
  Dimensions,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 32;

export type SkeletonVariant = 'card' | 'list' | 'profile' | 'grid' | 'game';

export interface LoadingSkeletonProps {
  variant?: SkeletonVariant;
  count?: number;
  style?: any;
  isLoading?: boolean;
  children?: React.ReactNode;
}

/**
 * Premium Loading Skeleton Component
 * Provides beautiful shimmer loading states for different UI patterns
 */
export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  variant = 'card',
  count = 1,
  style,
  isLoading = true,
  children,
}) => {
  // Animation value for custom shimmer
  const shimmerValue = useSharedValue(-1);

  useEffect(() => {
    shimmerValue.value = withRepeat(
      withTiming(1, {
        duration: 1500,
        easing: Easing.linear,
      }),
      -1,
      false
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: shimmerValue.value * (SCREEN_WIDTH + 100),
      },
    ],
  }));

  // If not loading, show children
  if (!isLoading && children) {
    return <>{children}</>;
  }

  // Render based on variant
  const renderSkeleton = () => {
    const items = Array.from({ length: count }, (_, index) => (
      <View key={index} style={[styles.skeletonContainer, style]}>
        {variant === 'card' && <CardSkeleton shimmerStyle={shimmerStyle} />}
        {variant === 'game' && <GameSkeleton shimmerStyle={shimmerStyle} />}
        {variant === 'list' && <ListSkeleton shimmerStyle={shimmerStyle} />}
        {variant === 'profile' && <ProfileSkeleton shimmerStyle={shimmerStyle} />}
        {variant === 'grid' && <GridSkeleton shimmerStyle={shimmerStyle} />}
      </View>
    ));

    return <>{items}</>;
  };

  return <View style={styles.container}>{renderSkeleton()}</View>;
};

// Card Skeleton Component
const CardSkeleton: React.FC<{ shimmerStyle: any }> = ({ shimmerStyle }) => {
  return (
    <View style={styles.cardSkeleton}>
      <View style={styles.cardImageSkeleton}>
        <Animated.View style={[styles.shimmer, shimmerStyle]}>
          <LinearGradient
            colors={[
              'rgba(255,255,255,0)',
              'rgba(255,255,255,0.05)',
              'rgba(255,255,255,0.1)',
              'rgba(255,255,255,0.05)',
              'rgba(255,255,255,0)',
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.shimmerGradient}
          />
        </Animated.View>
      </View>
      <View style={styles.cardContent}>
        <View style={styles.cardTitleSkeleton} />
        <View style={styles.cardSubtitleSkeleton} />
        <View style={styles.cardStatsRow}>
          <View style={styles.cardStatItem} />
          <View style={styles.cardStatItem} />
          <View style={styles.cardStatItem} />
        </View>
      </View>
    </View>
  );
};

// Game Skeleton Component (Full screen game card)
const GameSkeleton: React.FC<{ shimmerStyle: any }> = ({ shimmerStyle }) => {
  const { height: screenHeight } = Dimensions.get('window');
  const gameHeight = screenHeight - 130; // Account for tab bar and padding

  return (
    <View style={[styles.gameSkeleton, { height: gameHeight }]}>
      <View style={styles.gameImageSkeleton}>
        <Animated.View style={[styles.shimmer, shimmerStyle]}>
          <LinearGradient
            colors={[
              'rgba(255,255,255,0)',
              'rgba(255,255,255,0.05)',
              'rgba(255,255,255,0.1)',
              'rgba(255,255,255,0.05)',
              'rgba(255,255,255,0)',
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.shimmerGradient}
          />
        </Animated.View>
      </View>
      <View style={styles.gameOverlayContent}>
        <View style={styles.gameTitleSkeleton} />
        <View style={styles.gameDescSkeleton} />
        <View style={styles.gameStatsRow}>
          <View style={styles.gameStatItem} />
          <View style={styles.gameStatItem} />
          <View style={styles.gameStatItem} />
        </View>
      </View>
    </View>
  );
};

// List Skeleton Component
const ListSkeleton: React.FC<{ shimmerStyle: any }> = ({ shimmerStyle }) => {
  return (
    <View style={styles.listSkeleton}>
      <View style={styles.listImageSkeleton}>
        <Animated.View style={[styles.shimmer, shimmerStyle]}>
          <LinearGradient
            colors={[
              'rgba(255,255,255,0)',
              'rgba(255,255,255,0.05)',
              'rgba(255,255,255,0.1)',
              'rgba(255,255,255,0.05)',
              'rgba(255,255,255,0)',
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.shimmerGradient}
          />
        </Animated.View>
      </View>
      <View style={styles.listContent}>
        <View style={styles.listTitleSkeleton} />
        <View style={styles.listSubtitleSkeleton} />
        <View style={styles.listMetaSkeleton} />
      </View>
    </View>
  );
};

// Profile Skeleton Component
const ProfileSkeleton: React.FC<{ shimmerStyle: any }> = ({ shimmerStyle }) => {
  return (
    <View style={styles.profileSkeleton}>
      <View style={styles.profileHeader}>
        <View style={styles.profileAvatarSkeleton}>
          <Animated.View style={[styles.shimmer, shimmerStyle]}>
            <LinearGradient
              colors={[
                'rgba(255,255,255,0)',
                'rgba(255,255,255,0.05)',
                'rgba(255,255,255,0.1)',
                'rgba(255,255,255,0.05)',
                'rgba(255,255,255,0)',
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.shimmerGradient}
            />
          </Animated.View>
        </View>
        <View style={styles.profileInfo}>
          <View style={styles.profileNameSkeleton} />
          <View style={styles.profileUsernameSkeleton} />
        </View>
      </View>
      <View style={styles.profileBioSkeleton} />
      <View style={styles.profileStatsRow}>
        <View style={styles.profileStatItem} />
        <View style={styles.profileStatItem} />
        <View style={styles.profileStatItem} />
      </View>
    </View>
  );
};

// Grid Skeleton Component
const GridSkeleton: React.FC<{ shimmerStyle: any }> = ({ shimmerStyle }) => {
  return (
    <View style={styles.gridRow}>
      <View style={styles.gridItem}>
        <View style={styles.gridImageSkeleton}>
          <Animated.View style={[styles.shimmer, shimmerStyle]}>
            <LinearGradient
              colors={[
                'rgba(255,255,255,0)',
                'rgba(255,255,255,0.05)',
                'rgba(255,255,255,0.1)',
                'rgba(255,255,255,0.05)',
                'rgba(255,255,255,0)',
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.shimmerGradient}
            />
          </Animated.View>
        </View>
        <View style={styles.gridTitleSkeleton} />
      </View>
      <View style={styles.gridItem}>
        <View style={styles.gridImageSkeleton}>
          <Animated.View style={[styles.shimmer, shimmerStyle]}>
            <LinearGradient
              colors={[
                'rgba(255,255,255,0)',
                'rgba(255,255,255,0.05)',
                'rgba(255,255,255,0.1)',
                'rgba(255,255,255,0.05)',
                'rgba(255,255,255,0)',
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.shimmerGradient}
            />
          </Animated.View>
        </View>
        <View style={styles.gridTitleSkeleton} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skeletonContainer: {
    marginVertical: 8,
  },
  shimmer: {
    width: SCREEN_WIDTH + 100,
    height: '100%',
    position: 'absolute',
  },
  shimmerGradient: {
    flex: 1,
  },

  // Card Skeleton Styles
  cardSkeleton: {
    width: CARD_WIDTH,
    height: 240,
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    overflow: 'hidden',
    marginHorizontal: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  cardImageSkeleton: {
    width: '100%',
    height: 160,
    backgroundColor: '#252525',
    overflow: 'hidden',
  },
  cardContent: {
    padding: 16,
  },
  cardTitleSkeleton: {
    height: 20,
    width: '70%',
    backgroundColor: '#252525',
    borderRadius: 4,
    marginBottom: 8,
  },
  cardSubtitleSkeleton: {
    height: 14,
    width: '40%',
    backgroundColor: '#252525',
    borderRadius: 4,
    marginBottom: 12,
  },
  cardStatsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  cardStatItem: {
    height: 14,
    width: 50,
    backgroundColor: '#252525',
    borderRadius: 4,
  },

  // List Skeleton Styles
  listSkeleton: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    marginHorizontal: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  listImageSkeleton: {
    width: 80,
    height: 80,
    backgroundColor: '#252525',
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 16,
  },
  listContent: {
    flex: 1,
    justifyContent: 'center',
  },
  listTitleSkeleton: {
    height: 18,
    width: '80%',
    backgroundColor: '#252525',
    borderRadius: 4,
    marginBottom: 8,
  },
  listSubtitleSkeleton: {
    height: 14,
    width: '60%',
    backgroundColor: '#252525',
    borderRadius: 4,
    marginBottom: 8,
  },
  listMetaSkeleton: {
    height: 12,
    width: '40%',
    backgroundColor: '#252525',
    borderRadius: 4,
  },

  // Profile Skeleton Styles
  profileSkeleton: {
    padding: 20,
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    marginHorizontal: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  profileAvatarSkeleton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#252525',
    overflow: 'hidden',
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  profileNameSkeleton: {
    height: 20,
    width: '70%',
    backgroundColor: '#252525',
    borderRadius: 4,
    marginBottom: 8,
  },
  profileUsernameSkeleton: {
    height: 16,
    width: '50%',
    backgroundColor: '#252525',
    borderRadius: 4,
  },
  profileBioSkeleton: {
    height: 14,
    width: '100%',
    backgroundColor: '#252525',
    borderRadius: 4,
    marginBottom: 16,
  },
  profileStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  profileStatItem: {
    height: 40,
    width: 80,
    backgroundColor: '#252525',
    borderRadius: 8,
  },

  // Grid Skeleton Styles
  gridRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 16,
  },
  gridItem: {
    flex: 1,
  },
  gridImageSkeleton: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#252525',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  gridTitleSkeleton: {
    height: 14,
    width: '80%',
    backgroundColor: '#252525',
    borderRadius: 4,
  },

  // Game Skeleton Styles (Full screen)
  gameSkeleton: {
    width: CARD_WIDTH,
    backgroundColor: '#1A1A1A',
    borderRadius: 24,
    overflow: 'hidden',
    marginHorizontal: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  gameImageSkeleton: {
    width: '100%',
    height: '70%',
    backgroundColor: '#252525',
    overflow: 'hidden',
  },
  gameOverlayContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    backgroundColor: 'rgba(26, 26, 26, 0.95)',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  gameTitleSkeleton: {
    height: 24,
    width: '80%',
    backgroundColor: '#353535',
    borderRadius: 6,
    marginBottom: 12,
  },
  gameDescSkeleton: {
    height: 16,
    width: '60%',
    backgroundColor: '#353535',
    borderRadius: 4,
    marginBottom: 16,
  },
  gameStatsRow: {
    flexDirection: 'row',
    gap: 20,
  },
  gameStatItem: {
    height: 16,
    width: 60,
    backgroundColor: '#353535',
    borderRadius: 4,
  },
});

export default LoadingSkeleton;
