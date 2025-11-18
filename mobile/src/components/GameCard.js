import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function GameCard({ game, onPlay, onLike }) {
  const [avatarError, setAvatarError] = useState(false);

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: game.thumbnail }}
        style={styles.thumbnail}
        resizeMode="cover"
      />

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.95)']}
        style={styles.gradient}
      />

      <View style={styles.content}>
        <View style={styles.mainContent}>
          <Text style={styles.title}>{game.title}</Text>
          <Text style={styles.description} numberOfLines={2}>
            {game.description}
          </Text>

          <View style={styles.creatorContainer}>
            {game.creator?.avatar && !avatarError ? (
              <Image
                source={{ uri: game.creator?.avatar }}
                style={styles.avatar}
                onError={() => setAvatarError(true)}
              />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Ionicons name="person" size={16} color="#FF0050" />
              </View>
            )}
            <Text style={styles.creatorName}>@{game.creator?.username}</Text>
          </View>

          <View style={styles.tagsContainer}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{game.category}</Text>
            </View>
            {game.difficulty && (
              <View style={[styles.difficultyBadge, styles[`difficulty_${game.difficulty}`]]}>
                <Text style={styles.difficultyText}>{game.difficulty}</Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.playButton}
            onPress={() => onPlay(game)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="play" size={24} color="#fff" />
            <Text style={styles.playButtonText}>Play Now</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sidebar}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onLike(game._id)}
          >
            <Ionicons name="heart" size={32} color="#FF0050" />
            <Text style={styles.actionText}>
              {formatNumber(game.stats?.likes || 0)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="play-circle" size={32} color="#fff" />
            <Text style={styles.actionText}>
              {formatNumber(game.stats?.plays || 0)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="star" size={32} color="#FFD700" />
            <Text style={styles.actionText}>
              {game.averageRating?.toFixed(1) || '0.0'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="share-social" size={32} color="#fff" />
            <Text style={styles.actionText}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#000',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '50%',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  mainContent: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 20,
    paddingBottom: 100,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 12,
    opacity: 0.9,
  },
  creatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 2,
    borderColor: '#FF0050',
  },
  avatarFallback: {
    backgroundColor: 'rgba(255, 0, 80, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  creatorName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  tagsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  categoryBadge: {
    backgroundColor: 'rgba(255, 0, 80, 0.2)',
    borderWidth: 1,
    borderColor: '#FF0050',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
  },
  categoryText: {
    color: '#FF0050',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  difficultyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  difficulty_easy: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderColor: '#4CAF50',
  },
  difficulty_medium: {
    backgroundColor: 'rgba(255, 152, 0, 0.2)',
    borderColor: '#FF9800',
  },
  difficulty_hard: {
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
    borderColor: '#F44336',
  },
  difficultyText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  playButton: {
    backgroundColor: '#FF0050',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 30,
    alignSelf: 'flex-start',
    minHeight: 48,
    minWidth: 120,
  },
  playButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  sidebar: {
    justifyContent: 'flex-end',
    paddingRight: 12,
    paddingBottom: 100,
  },
  actionButton: {
    alignItems: 'center',
    marginBottom: 24,
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
});
