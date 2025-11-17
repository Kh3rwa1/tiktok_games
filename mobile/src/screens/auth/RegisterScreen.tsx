/**
 * Premium Register Screen
 * AAA+ Quality TypeScript Implementation
 * Features: Form Validation, Firebase Auth, Animations, Haptic Feedback
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Stores & Types
import { useAuthStore } from '../../store/authStore';
import { RootStackParamList } from '../../types';

// Components
import { PremiumButton } from '../../components';

// Utils
import { triggerMedium, triggerSuccess, triggerError } from '../../utils/haptics';

const { width, height } = Dimensions.get('window');

type RegisterScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Register'>;

interface Props {
  navigation: RegisterScreenNavigationProp;
}

export default function RegisterScreen({ navigation }: Props) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { signUp, error } = useAuthStore();

  // Animation values
  const logoScale = useSharedValue(0);
  const formTranslateY = useSharedValue(50);
  const shakeAnimation = useSharedValue(0);

  useEffect(() => {
    // Entrance animations
    logoScale.value = withSpring(1, {
      damping: 15,
      stiffness: 100,
    });
    formTranslateY.value = withTiming(0, { duration: 800 });
  }, []);

  useEffect(() => {
    if (error) {
      // Shake animation on error
      shakeAnimation.value = withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
      triggerError();
    }
  }, [error]);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
  }));

  const formStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: formTranslateY.value },
      { translateX: shakeAnimation.value },
    ],
  }));

  const validateForm = (): { valid: boolean; message?: string } => {
    // Username validation
    if (!username.trim()) {
      return { valid: false, message: 'Username is required' };
    }
    if (username.trim().length < 3) {
      return { valid: false, message: 'Username must be at least 3 characters' };
    }
    if (username.trim().length > 20) {
      return { valid: false, message: 'Username must be less than 20 characters' };
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
      return { valid: false, message: 'Username can only contain letters, numbers, and underscores' };
    }

    // Email validation
    if (!email.trim()) {
      return { valid: false, message: 'Email is required' };
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return { valid: false, message: 'Please enter a valid email address' };
    }

    // Password validation
    if (!password.trim()) {
      return { valid: false, message: 'Password is required' };
    }
    if (password.length < 8) {
      return { valid: false, message: 'Password must be at least 8 characters' };
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return { valid: false, message: 'Password must contain uppercase, lowercase, and number' };
    }

    // Confirm password validation
    if (!confirmPassword.trim()) {
      return { valid: false, message: 'Please confirm your password' };
    }
    if (password !== confirmPassword) {
      return { valid: false, message: 'Passwords do not match' };
    }

    return { valid: true };
  };

  const handleRegister = async () => {
    // Validate form
    const validation = validateForm();
    if (!validation.valid) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: validation.message,
        position: 'top',
        visibilityTime: 3000,
      });
      triggerError();
      return;
    }

    try {
      setIsSubmitting(true);
      triggerMedium();

      await signUp(username.trim(), email.toLowerCase().trim(), password);

      triggerSuccess();
      Toast.show({
        type: 'success',
        text1: 'Account Created!',
        text2: 'Welcome to TikTok Games',
        position: 'top',
        visibilityTime: 2000,
      });
    } catch (err: any) {
      console.error('Registration error:', err);

      let errorMessage = 'Failed to create account. Please try again.';

      // Firebase error handling
      if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'An account with this email already exists.';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address format.';
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please use a stronger password.';
      } else if (err.code === 'auth/operation-not-allowed') {
        errorMessage = 'Email/password accounts are not enabled.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      Toast.show({
        type: 'error',
        text1: 'Registration Failed',
        text2: errorMessage,
        position: 'top',
        visibilityTime: 4000,
      });
      triggerError();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoginNavigation = () => {
    triggerMedium();
    navigation.navigate('Login');
  };

  const togglePasswordVisibility = () => {
    triggerMedium();
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    triggerMedium();
    setShowConfirmPassword(!showConfirmPassword);
  };

  // Password strength indicator
  const getPasswordStrength = (): { strength: number; label: string; color: string } => {
    if (!password) return { strength: 0, label: '', color: '#666' };

    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    if (strength <= 2) return { strength: 33, label: 'Weak', color: '#FF3B30' };
    if (strength <= 4) return { strength: 66, label: 'Medium', color: '#FF9500' };
    return { strength: 100, label: 'Strong', color: '#34C759' };
  };

  const passwordStrength = getPasswordStrength();

  return (
    <LinearGradient
      colors={['#000000', '#1a0a1a', '#000000']}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo Section */}
          <Animated.View style={[styles.logoContainer, logoStyle]}>
            <LinearGradient
              colors={['#FF0050', '#FF4500']}
              style={styles.logoGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="game-controller" size={60} color="#fff" />
            </LinearGradient>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join the gaming community</Text>
          </Animated.View>

          {/* Form Section */}
          <Animated.View style={[styles.formContainer, formStyle]} entering={FadeInDown.delay(200)}>
            {/* Username Input */}
            <View style={styles.inputContainer}>
              <View style={styles.inputIconContainer}>
                <Ionicons name="person-outline" size={20} color="#666" />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Username"
                placeholderTextColor="#666"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSubmitting}
                maxLength={20}
              />
            </View>

            {/* Email Input */}
            <View style={styles.inputContainer}>
              <View style={styles.inputIconContainer}>
                <Ionicons name="mail-outline" size={20} color="#666" />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor="#666"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSubmitting}
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <View style={styles.inputIconContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="#666" />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#666"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSubmitting}
              />
              <TouchableOpacity
                style={styles.passwordToggle}
                onPress={togglePasswordVisibility}
                disabled={isSubmitting}
              >
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color="#666"
                />
              </TouchableOpacity>
            </View>

            {/* Password Strength Indicator */}
            {password.length > 0 && (
              <View style={styles.strengthContainer}>
                <View style={styles.strengthBar}>
                  <View
                    style={[
                      styles.strengthFill,
                      {
                        width: `${passwordStrength.strength}%`,
                        backgroundColor: passwordStrength.color,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.strengthLabel, { color: passwordStrength.color }]}>
                  {passwordStrength.label}
                </Text>
              </View>
            )}

            {/* Confirm Password Input */}
            <View style={styles.inputContainer}>
              <View style={styles.inputIconContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="#666" />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Confirm password"
                placeholderTextColor="#666"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSubmitting}
              />
              <TouchableOpacity
                style={styles.passwordToggle}
                onPress={toggleConfirmPasswordVisibility}
                disabled={isSubmitting}
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color="#666"
                />
              </TouchableOpacity>
            </View>

            {/* Register Button */}
            <PremiumButton
              title={isSubmitting ? 'Creating Account...' : 'Create Account'}
              onPress={handleRegister}
              variant="gradient"
              size="large"
              disabled={isSubmitting}
              loading={isSubmitting}
              style={styles.registerButton}
            />

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Login Link */}
            <TouchableOpacity
              style={styles.loginContainer}
              onPress={handleLoginNavigation}
              disabled={isSubmitting}
            >
              <Text style={styles.loginText}>
                Already have an account?{' '}
                <Text style={styles.loginLink}>Sign In</Text>
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Footer */}
          <Animated.View style={styles.footer} entering={FadeIn.delay(400)}>
            <Text style={styles.footerText}>
              By creating an account, you agree to our Terms of Service and Privacy Policy
            </Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    minHeight: height,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#FF0050',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
    fontWeight: '500',
  },
  formContainer: {
    width: '100%',
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#2a2a2a',
    height: 60,
  },
  inputIconContainer: {
    paddingLeft: 16,
    paddingRight: 12,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    paddingRight: 16,
  },
  passwordToggle: {
    paddingHorizontal: 16,
  },
  strengthContainer: {
    marginBottom: 16,
    marginTop: -8,
  },
  strengthBar: {
    height: 4,
    backgroundColor: '#2a2a2a',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
  },
  registerButton: {
    marginTop: 8,
    marginBottom: 24,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#2a2a2a',
  },
  dividerText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
    marginHorizontal: 16,
  },
  loginContainer: {
    alignItems: 'center',
    padding: 16,
  },
  loginText: {
    color: '#999',
    fontSize: 15,
    fontWeight: '500',
  },
  loginLink: {
    color: '#FF0050',
    fontWeight: '700',
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 32,
    paddingBottom: 16,
  },
  footerText: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
