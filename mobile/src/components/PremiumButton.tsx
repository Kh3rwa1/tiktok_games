import React, { useCallback } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  ViewStyle,
  TextStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { triggerMedium, triggerLight } from '../utils/haptics';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'small' | 'medium' | 'large';

export interface PremiumButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  hapticFeedback?: boolean;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

/**
 * Premium Button Component
 * A beautiful, animated button with multiple variants and haptic feedback
 */
export const PremiumButton: React.FC<PremiumButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  style,
  textStyle,
  hapticFeedback = true,
}) => {
  // Animation values
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  // Get variant colors
  const getVariantColors = (): string[] => {
    switch (variant) {
      case 'primary':
        return ['#667eea', '#764ba2'];
      case 'secondary':
        return ['#f093fb', '#f5576c'];
      case 'outline':
        return ['transparent', 'transparent'];
      case 'ghost':
        return ['transparent', 'transparent'];
      case 'danger':
        return ['#fc466b', '#3f5efb'];
      default:
        return ['#667eea', '#764ba2'];
    }
  };

  // Get size styles
  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          paddingVertical: 8,
          paddingHorizontal: 16,
          fontSize: 14,
          iconSize: 16,
        };
      case 'medium':
        return {
          paddingVertical: 14,
          paddingHorizontal: 24,
          fontSize: 16,
          iconSize: 20,
        };
      case 'large':
        return {
          paddingVertical: 18,
          paddingHorizontal: 32,
          fontSize: 18,
          iconSize: 24,
        };
      default:
        return {
          paddingVertical: 14,
          paddingHorizontal: 24,
          fontSize: 16,
          iconSize: 20,
        };
    }
  };

  const sizeStyles = getSizeStyles();

  // Animated styles
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  // Handlers
  const handlePressIn = useCallback(() => {
    if (disabled || loading) return;

    scale.value = withSpring(0.95, {
      damping: 15,
      stiffness: 150,
    });

    if (hapticFeedback) {
      triggerLight();
    }
  }, [disabled, loading, hapticFeedback]);

  const handlePressOut = useCallback(() => {
    if (disabled || loading) return;

    scale.value = withSpring(1, {
      damping: 15,
      stiffness: 150,
    });
  }, [disabled, loading]);

  const handlePress = useCallback(() => {
    if (disabled || loading) return;

    if (hapticFeedback) {
      triggerMedium();
    }

    onPress();
  }, [disabled, loading, hapticFeedback, onPress]);

  // Render icon
  const renderIcon = () => {
    if (!icon) return null;

    return (
      <Ionicons
        name={icon}
        size={sizeStyles.iconSize}
        color={getTextColor()}
        style={iconPosition === 'left' ? styles.iconLeft : styles.iconRight}
      />
    );
  };

  // Get text color based on variant
  const getTextColor = (): string => {
    if (disabled) return '#666';
    if (variant === 'outline' || variant === 'ghost') return '#FFF';
    return '#FFF';
  };

  // Render button content
  const renderContent = () => {
    if (loading) {
      return (
        <ActivityIndicator
          size="small"
          color={getTextColor()}
          style={styles.loader}
        />
      );
    }

    return (
      <>
        {iconPosition === 'left' && renderIcon()}
        <Text
          style={[
            styles.text,
            {
              fontSize: sizeStyles.fontSize,
              color: getTextColor(),
            },
            textStyle,
          ]}
        >
          {title}
        </Text>
        {iconPosition === 'right' && renderIcon()}
      </>
    );
  };

  // For outline and ghost variants, don't use gradient
  if (variant === 'outline' || variant === 'ghost') {
    return (
      <AnimatedTouchable
        activeOpacity={0.8}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        disabled={disabled || loading}
        style={[
          styles.button,
          {
            paddingVertical: sizeStyles.paddingVertical,
            paddingHorizontal: sizeStyles.paddingHorizontal,
          },
          variant === 'outline' && styles.outlineButton,
          variant === 'ghost' && styles.ghostButton,
          fullWidth && styles.fullWidth,
          disabled && styles.disabled,
          animatedStyle,
          style,
        ]}
      >
        {renderContent()}
      </AnimatedTouchable>
    );
  }

  // For primary, secondary, and danger variants, use gradient
  return (
    <AnimatedTouchable
      activeOpacity={1}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={disabled || loading}
      style={[
        styles.buttonWrapper,
        fullWidth && styles.fullWidth,
        animatedStyle,
        style,
      ]}
    >
      <LinearGradient
        colors={disabled ? ['#333', '#333'] : getVariantColors()}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.gradient,
          {
            paddingVertical: sizeStyles.paddingVertical,
            paddingHorizontal: sizeStyles.paddingHorizontal,
          },
        ]}
      >
        {renderContent()}
      </LinearGradient>
    </AnimatedTouchable>
  );
};

const styles = StyleSheet.create({
  buttonWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  outlineButton: {
    borderWidth: 2,
    borderColor: '#667eea',
    backgroundColor: 'transparent',
  },
  ghostButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
  loader: {
    paddingVertical: 2,
  },
});

export default PremiumButton;
