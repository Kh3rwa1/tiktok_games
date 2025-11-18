/**
 * Onboarding Screen with Lottie Animations
 * Neo-Brutalism styled multi-slide onboarding flow
 */

import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { triggerLight, triggerMedium } from '../../utils/haptics';

const { width, height } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  title: string;
  description: string;
  lottieUrl: string;
  backgroundColor: string;
}

interface OnboardingScreenProps {
  onComplete: () => void;
}

const slides: OnboardingSlide[] = [
  {
    id: '1',
    title: 'Welcome to Kisku',
    description: 'Discover amazing games from creators around the world. Play, enjoy, and have fun!',
    lottieUrl: 'https://lottie.host/2a9f120a-3e3d-4d34-9d96-f9c7e4790e7a/gE6A3ysqEO.json',
    backgroundColor: '#FF6B6B',
  },
  {
    id: '2',
    title: 'Discover Games',
    description: 'Swipe through endless games like your favorite social feed. Find your next favorite game instantly!',
    lottieUrl: 'https://lottie.host/49e8d0ca-5a4d-4a3a-9cd6-1a7a6a88f7c9/5wRfGaZE1T.json',
    backgroundColor: '#4ECDC4',
  },
  {
    id: '3',
    title: 'Play & Enjoy',
    description: 'Jump right into games with one tap. No downloads, no waiting - just pure fun!',
    lottieUrl: 'https://lottie.host/a7ca5ed7-0e5c-4c4e-bc07-7d0e7f8c0e1c/xK8qMK7m9g.json',
    backgroundColor: '#FFE66D',
  },
];

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const buttonScale = useSharedValue(1);
  const skipOpacity = useSharedValue(1);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    if (slideIndex !== currentIndex) {
      setCurrentIndex(slideIndex);
      triggerLight();
    }
  };

  const handleNext = () => {
    triggerMedium();
    buttonScale.value = withSpring(0.95, {}, () => {
      buttonScale.value = withSpring(1);
    });

    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    triggerLight();
    skipOpacity.value = withTiming(0.5, { duration: 100 }, () => {
      skipOpacity.value = withTiming(1, { duration: 100 });
    });
    onComplete();
  };

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const skipAnimatedStyle = useAnimatedStyle(() => ({
    opacity: skipOpacity.value,
  }));

  const renderSlide = ({ item, index }: { item: OnboardingSlide; index: number }) => (
    <View style={[styles.slide, { backgroundColor: item.backgroundColor }]}>
      <View style={styles.lottieContainer}>
        <LottieView
          source={{ uri: item.lottieUrl }}
          autoPlay
          loop
          style={styles.lottie}
        />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description}>{item.description}</Text>
      </View>
    </View>
  );

  const renderPagination = () => (
    <View style={styles.paginationContainer}>
      {slides.map((_, index) => (
        <View
          key={index}
          style={[
            styles.paginationDot,
            index === currentIndex && styles.paginationDotActive,
          ]}
        />
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Skip Button */}
      <Animated.View style={[styles.skipContainer, skipAnimatedStyle]}>
        <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        bounces={false}
      />

      {/* Bottom Section */}
      <View style={styles.bottomContainer}>
        {renderPagination()}

        <Animated.View style={buttonAnimatedStyle}>
          <TouchableOpacity
            style={styles.nextButton}
            onPress={handleNext}
            activeOpacity={0.8}
          >
            <Text style={styles.nextButtonText}>
              {currentIndex === slides.length - 1 ? "Let's Go!" : 'Next'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFEF0',
  },
  skipContainer: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
  },
  skipButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 5,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#000000',
  },
  slide: {
    width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  lottieContainer: {
    width: width * 0.8,
    height: height * 0.4,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  lottie: {
    width: '90%',
    height: '90%',
  },
  textContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  description: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    lineHeight: 24,
  },
  bottomContainer: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    backgroundColor: '#FFFEF0',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  paginationDot: {
    width: 12,
    height: 12,
    backgroundColor: '#CCCCCC',
    marginHorizontal: 6,
    borderWidth: 2,
    borderColor: '#000000',
  },
  paginationDotActive: {
    backgroundColor: '#FF6B6B',
    width: 32,
  },
  nextButton: {
    backgroundColor: '#000000',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderWidth: 3,
    borderColor: '#000000',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 5,
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
});
