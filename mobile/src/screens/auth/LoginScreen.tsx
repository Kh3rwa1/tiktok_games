/**
 * Premium Login Screen
 * AAA+ Quality TypeScript Implementation
 * Features: Firebase Auth, Animations, Haptic Feedback, Error Handling
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
import type { StackNavigationProp } from '@react-navigation/stack';

// Stores & Types
import { useAuthStore } from '../../store/authStore';
import { RootStackParamList } from '../../types';

// Components
import { PremiumButton } from '../../components';

// Utils
import { triggerMedium, triggerSuccess, triggerError } from '../../utils/haptics';

const { width, height } = Dimensions.get('window');

type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;

interface Props {
  navigation: LoginScreenNavigationProp;
}

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { signIn, error } = useAuthStore();

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

  const handleLogin = async () => {
    // Validation
    if (!email.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Email Required',
        text2: 'Please enter your email address',
        position: 'top',
        visibilityTime: 3000,
      });
      triggerError();
      return;
    }

    if (!password.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Password Required',
        text2: 'Please enter your password',
        position: 'top',
        visibilityTime: 3000,
      });
      triggerError();
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Toast.show({
        type: 'error',
        text1: 'Invalid Email',
        text2: 'Please enter a valid email address',
        position: 'top',
        visibilityTime: 3000,
      });
      triggerError();
      return;
    }

    try {
      setIsSubmitting(true);
      triggerMedium();

      await signIn(email.toLowerCase().trim(), password);

      triggerSuccess();
      Toast.show({
        type: 'success',
        text1: 'Welcome Back!',
        text2: 'Login successful',
        position: 'top',
        visibilityTime: 2000,
      });
    } catch (err: any) {
      console.error('Login error:', err);

      let errorMessage = 'Failed to sign in. Please try again.';

      // Firebase error handling
      if (err.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email.';
      } else if (err.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password. Please try again.';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address format.';
      } else if (err.code === 'auth/user-disabled') {
        errorMessage = 'This account has been disabled.';
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      Toast.show({
        type: 'error',
        text1: 'Login Failed',
        text2: errorMessage,
        position: 'top',
        visibilityTime: 4000,
      });
      triggerError();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterNavigation = () => {
    triggerMedium();
    navigation.navigate('Register');
  };

  const togglePasswordVisibility = () => {
    triggerMedium();
    setShowPassword(!showPassword);
  };

  return (
    <View style={styles.container}>
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
            <View style={styles.logoGradient}>
              <Ionicons name="game-controller" size={60} color="#000000" />
            </View>
            <Text style={styles.title}>Kisku</Text>
            <Text style={styles.subtitle}>Welcome back! Ready to play?</Text>
          </Animated.View>

          {/* Form Section */}
          <Animated.View style={[styles.formContainer, formStyle]} entering={FadeInDown.delay(200)}>
            {/* Email Input */}
            <View style={styles.inputContainer}>
              <View style={styles.inputIconContainer}>
                <Ionicons name="mail-outline" size={20} color="#000000" />
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
                <Ionicons name="lock-closed-outline" size={20} color="#000000" />
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
                  color="#000000"
                />
              </TouchableOpacity>
            </View>

            {/* Login Button */}
            <PremiumButton
              title={isSubmitting ? 'Signing In...' : 'Sign In'}
              onPress={handleLogin}
              variant="gradient"
              size="large"
              disabled={isSubmitting}
              loading={isSubmitting}
              style={styles.loginButton}
            />

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Register Link */}
            <TouchableOpacity
              style={styles.registerContainer}
              onPress={handleRegisterNavigation}
              disabled={isSubmitting}
            >
              <Text style={styles.registerText}>
                Don't have an account?{' '}
                <Text style={styles.registerLink}>Sign Up</Text>
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Footer */}
          <Animated.View style={styles.footer} entering={FadeIn.delay(400)}>
            <Text style={styles.footerText}>
              By continuing, you agree to our Terms of Service and Privacy Policy
            </Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFEF0',
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
    marginBottom: 40,
  },
  logoGradient: {
    width: 100,
    height: 100,
    borderRadius: 0,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 12,
    backgroundColor: '#FF6B6B',
    borderWidth: 3,
    borderColor: '#000000',
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#000000',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '700',
  },
  formContainer: {
    width: '100%',
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFEF0',
    borderRadius: 0,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#000000',
    height: 60,
    shadowColor: '#000000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  inputIconContainer: {
    paddingLeft: 16,
    paddingRight: 12,
  },
  input: {
    flex: 1,
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
    paddingRight: 16,
  },
  passwordToggle: {
    paddingHorizontal: 16,
  },
  loginButton: {
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
    height: 3,
    backgroundColor: '#000000',
  },
  dividerText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '900',
    marginHorizontal: 16,
  },
  registerContainer: {
    alignItems: 'center',
    padding: 16,
  },
  registerText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '700',
  },
  registerLink: {
    color: '#FF6B6B',
    fontWeight: '900',
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 32,
    paddingBottom: 16,
  },
  footerText: {
    color: '#000000',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '700',
  },
});
