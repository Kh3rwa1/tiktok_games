/**
 * AAA+ Premium Animation System
 * Ultra-smooth 120fps animations with physics-based interactions
 */

import {
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  withRepeat,
  Easing,
  interpolate,
  Extrapolate,
  SharedValue,
  cancelAnimation,
  runOnJS,
} from 'react-native-reanimated';

// ==================== SPRING CONFIGURATIONS ====================

export const SPRING_CONFIGS = {
  // Snappy - Quick responses for micro-interactions
  snappy: {
    damping: 20,
    stiffness: 400,
    mass: 0.8,
  },
  // Bouncy - Playful feel for buttons and cards
  bouncy: {
    damping: 12,
    stiffness: 180,
    mass: 0.9,
  },
  // Gentle - Smooth transitions for modals and sheets
  gentle: {
    damping: 26,
    stiffness: 170,
    mass: 1,
  },
  // Stiff - Fast and precise for toggles
  stiff: {
    damping: 30,
    stiffness: 500,
    mass: 0.5,
  },
  // Wobbly - Fun wobble effect
  wobbly: {
    damping: 8,
    stiffness: 200,
    mass: 0.8,
  },
  // Slow - Elegant slow animations
  slow: {
    damping: 30,
    stiffness: 90,
    mass: 1.2,
  },
} as const;

// ==================== TIMING CONFIGURATIONS ====================

export const TIMING_CONFIGS = {
  // Ultra fast - 100ms
  ultraFast: {
    duration: 100,
    easing: Easing.bezier(0.25, 0.1, 0.25, 1),
  },
  // Fast - 200ms
  fast: {
    duration: 200,
    easing: Easing.bezier(0.4, 0, 0.2, 1),
  },
  // Normal - 300ms
  normal: {
    duration: 300,
    easing: Easing.bezier(0.4, 0, 0.2, 1),
  },
  // Slow - 500ms
  slow: {
    duration: 500,
    easing: Easing.bezier(0.4, 0, 0.2, 1),
  },
  // Elegant - Custom bezier for smooth feel
  elegant: {
    duration: 400,
    easing: Easing.bezier(0.22, 1, 0.36, 1),
  },
  // Bounce out
  bounceOut: {
    duration: 600,
    easing: Easing.bezier(0.34, 1.56, 0.64, 1),
  },
} as const;

// ==================== ANIMATION PRESETS ====================

// Scale animations
export const scaleIn = (value: SharedValue<number>, config = SPRING_CONFIGS.bouncy) => {
  'worklet';
  value.value = withSpring(1, config);
};

export const scaleOut = (value: SharedValue<number>, config = SPRING_CONFIGS.snappy) => {
  'worklet';
  value.value = withSpring(0, config);
};

export const scalePulse = (value: SharedValue<number>) => {
  'worklet';
  value.value = withSequence(
    withSpring(1.1, SPRING_CONFIGS.stiff),
    withSpring(1, SPRING_CONFIGS.bouncy)
  );
};

export const scalePress = (value: SharedValue<number>, pressed: boolean) => {
  'worklet';
  value.value = withSpring(pressed ? 0.95 : 1, SPRING_CONFIGS.snappy);
};

// Opacity animations
export const fadeIn = (value: SharedValue<number>, duration = 300) => {
  'worklet';
  value.value = withTiming(1, { duration, easing: Easing.out(Easing.ease) });
};

export const fadeOut = (value: SharedValue<number>, duration = 200) => {
  'worklet';
  value.value = withTiming(0, { duration, easing: Easing.in(Easing.ease) });
};

// Translation animations
export const slideInFromRight = (value: SharedValue<number>, distance = 100) => {
  'worklet';
  value.value = withSpring(0, SPRING_CONFIGS.gentle);
};

export const slideInFromBottom = (value: SharedValue<number>) => {
  'worklet';
  value.value = withSpring(0, SPRING_CONFIGS.gentle);
};

export const slideOutToBottom = (value: SharedValue<number>, distance = 300) => {
  'worklet';
  value.value = withTiming(distance, TIMING_CONFIGS.fast);
};

// Rotation animations
export const rotate360 = (value: SharedValue<number>) => {
  'worklet';
  value.value = withSequence(
    withTiming(360, { duration: 600, easing: Easing.bezier(0.4, 0, 0.2, 1) }),
    withTiming(0, { duration: 0 })
  );
};

export const wiggle = (value: SharedValue<number>) => {
  'worklet';
  value.value = withSequence(
    withTiming(-5, { duration: 50 }),
    withTiming(5, { duration: 100 }),
    withTiming(-5, { duration: 100 }),
    withTiming(5, { duration: 100 }),
    withTiming(0, { duration: 50 })
  );
};

export const shake = (value: SharedValue<number>) => {
  'worklet';
  value.value = withSequence(
    withTiming(-10, { duration: 50 }),
    withRepeat(withTiming(10, { duration: 100 }), 3, true),
    withTiming(0, { duration: 50 })
  );
};

// ==================== COMPLEX ANIMATIONS ====================

// Bounce in effect
export const bounceIn = (
  scale: SharedValue<number>,
  opacity: SharedValue<number>
) => {
  'worklet';
  scale.value = 0;
  opacity.value = 0;

  scale.value = withSequence(
    withSpring(1.2, SPRING_CONFIGS.stiff),
    withSpring(0.9, SPRING_CONFIGS.bouncy),
    withSpring(1, SPRING_CONFIGS.gentle)
  );
  opacity.value = withTiming(1, { duration: 200 });
};

// Pop effect for buttons
export const pop = (scale: SharedValue<number>) => {
  'worklet';
  scale.value = withSequence(
    withSpring(0.85, { damping: 20, stiffness: 400 }),
    withSpring(1.1, { damping: 10, stiffness: 200 }),
    withSpring(1, { damping: 15, stiffness: 300 })
  );
};

// Heartbeat effect
export const heartbeat = (scale: SharedValue<number>) => {
  'worklet';
  scale.value = withRepeat(
    withSequence(
      withTiming(1.2, { duration: 200 }),
      withTiming(1, { duration: 200 }),
      withTiming(1.2, { duration: 200 }),
      withTiming(1, { duration: 400 })
    ),
    -1,
    false
  );
};

// Float effect for cards
export const float = (translateY: SharedValue<number>) => {
  'worklet';
  translateY.value = withRepeat(
    withSequence(
      withTiming(-10, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
    ),
    -1,
    true
  );
};

// Glow pulse effect
export const glowPulse = (opacity: SharedValue<number>) => {
  'worklet';
  opacity.value = withRepeat(
    withSequence(
      withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      withTiming(0.3, { duration: 1000, easing: Easing.inOut(Easing.ease) })
    ),
    -1,
    true
  );
};

// Shimmer effect helper
export const shimmer = (translateX: SharedValue<number>, width: number) => {
  'worklet';
  translateX.value = withRepeat(
    withTiming(width, { duration: 1500, easing: Easing.linear }),
    -1,
    false
  );
};

// ==================== STAGGER HELPERS ====================

export const getStaggerDelay = (index: number, baseDelay = 50): number => {
  return index * baseDelay;
};

export const getStaggeredEntering = (index: number, baseDelay = 50) => {
  return {
    delay: getStaggerDelay(index, baseDelay),
    duration: 400,
  };
};

// ==================== INTERPOLATION HELPERS ====================

export const createScrollInterpolation = (
  scrollY: number,
  inputRange: number[],
  outputRange: number[]
) => {
  'worklet';
  return interpolate(scrollY, inputRange, outputRange, Extrapolate.CLAMP);
};

// Parallax effect
export const parallax = (scrollY: number, speed = 0.5): number => {
  'worklet';
  return scrollY * speed;
};

// Scale based on scroll position
export const scrollScale = (
  scrollY: number,
  itemIndex: number,
  itemHeight: number
): number => {
  'worklet';
  const inputRange = [
    (itemIndex - 1) * itemHeight,
    itemIndex * itemHeight,
    (itemIndex + 1) * itemHeight,
  ];
  return interpolate(scrollY, inputRange, [0.9, 1, 0.9], Extrapolate.CLAMP);
};

// Opacity based on scroll position
export const scrollOpacity = (
  scrollY: number,
  itemIndex: number,
  itemHeight: number
): number => {
  'worklet';
  const inputRange = [
    (itemIndex - 1) * itemHeight,
    itemIndex * itemHeight,
    (itemIndex + 1) * itemHeight,
  ];
  return interpolate(scrollY, inputRange, [0.5, 1, 0.5], Extrapolate.CLAMP);
};

// ==================== GESTURE ANIMATIONS ====================

export const onGestureStart = (
  scale: SharedValue<number>,
  opacity: SharedValue<number>
) => {
  'worklet';
  scale.value = withSpring(0.98, SPRING_CONFIGS.snappy);
  opacity.value = withTiming(0.9, { duration: 100 });
};

export const onGestureEnd = (
  scale: SharedValue<number>,
  opacity: SharedValue<number>
) => {
  'worklet';
  scale.value = withSpring(1, SPRING_CONFIGS.bouncy);
  opacity.value = withTiming(1, { duration: 100 });
};

// Drag release with momentum
export const releaseWithMomentum = (
  translateY: SharedValue<number>,
  velocity: number,
  snapPoints: number[]
) => {
  'worklet';
  // Find closest snap point
  const target = snapPoints.reduce((prev, curr) =>
    Math.abs(curr - translateY.value) < Math.abs(prev - translateY.value) ? curr : prev
  );

  translateY.value = withSpring(target, {
    ...SPRING_CONFIGS.gentle,
    velocity,
  });
};

// ==================== COLOR ANIMATIONS ====================

export const colorInterpolate = (
  progress: number,
  startColor: string,
  endColor: string
): string => {
  'worklet';
  // Simple interpolation between two hex colors
  const start = parseInt(startColor.slice(1), 16);
  const end = parseInt(endColor.slice(1), 16);

  const r1 = (start >> 16) & 255;
  const g1 = (start >> 8) & 255;
  const b1 = start & 255;

  const r2 = (end >> 16) & 255;
  const g2 = (end >> 8) & 255;
  const b2 = end & 255;

  const r = Math.round(r1 + (r2 - r1) * progress);
  const g = Math.round(g1 + (g2 - g1) * progress);
  const b = Math.round(b1 + (b2 - b1) * progress);

  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
};

// ==================== UTILITY FUNCTIONS ====================

export const cancelAllAnimations = (...values: SharedValue<number>[]) => {
  'worklet';
  values.forEach(value => cancelAnimation(value));
};

export const resetValue = (value: SharedValue<number>, target = 0) => {
  'worklet';
  value.value = target;
};

// ==================== ENTERING/EXITING ANIMATION CONFIGS ====================

export const ENTERING_ANIMATIONS = {
  fadeInUp: {
    initialValues: {
      opacity: 0,
      transform: [{ translateY: 20 }],
    },
    animations: {
      opacity: { duration: 300 },
      transform: [{ translateY: { duration: 400 } }],
    },
  },
  fadeInDown: {
    initialValues: {
      opacity: 0,
      transform: [{ translateY: -20 }],
    },
    animations: {
      opacity: { duration: 300 },
      transform: [{ translateY: { duration: 400 } }],
    },
  },
  zoomIn: {
    initialValues: {
      opacity: 0,
      transform: [{ scale: 0.8 }],
    },
    animations: {
      opacity: { duration: 200 },
      transform: [{ scale: { duration: 400 } }],
    },
  },
  slideInRight: {
    initialValues: {
      transform: [{ translateX: 100 }],
    },
    animations: {
      transform: [{ translateX: { duration: 400 } }],
    },
  },
};

export const EXITING_ANIMATIONS = {
  fadeOutDown: {
    animations: {
      opacity: { duration: 200 },
      transform: [{ translateY: { duration: 300 } }],
    },
    callback: () => {
      'worklet';
    },
  },
  zoomOut: {
    animations: {
      opacity: { duration: 150 },
      transform: [{ scale: { duration: 200 } }],
    },
  },
};

// ==================== THEME COLORS - Neo-Brutalism ====================

export const ANIMATION_COLORS = {
  primary: '#FF6B6B',
  secondary: '#4ECDC4',
  success: '#A8E6CF',
  warning: '#FFDE59',
  error: '#FF6B6B',
  background: '#FFFEF0',
  text: '#000000',
  border: '#000000',
};

export default {
  SPRING_CONFIGS,
  TIMING_CONFIGS,
  ANIMATION_COLORS,
  ENTERING_ANIMATIONS,
  EXITING_ANIMATIONS,
};
