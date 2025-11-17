import React, { Component, ReactNode, ErrorInfo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Platform,
  Dimensions,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInUp,
  SlideInDown,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import PremiumButton from './PremiumButton';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isRetrying: boolean;
}

/**
 * Premium Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree
 * and displays a beautiful fallback UI with retry mechanism
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isRetrying: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Update state with error info
    this.setState({
      errorInfo,
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = (): void => {
    this.setState({ isRetrying: true });

    // Simulate retry delay for smooth animation
    setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        isRetrying: false,
      });

      // Call optional reset handler
      if (this.props.onReset) {
        this.props.onReset();
      }
    }, 500);
  };

  renderErrorUI(): ReactNode {
    const { error, errorInfo } = this.state;
    const isDevelopment = __DEV__;

    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#1A1A1A', '#2A1A2A', '#1A1A1A']}
          style={styles.gradient}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Error Icon */}
            <Animated.View
              entering={FadeIn.duration(600).delay(100)}
              style={styles.iconContainer}
            >
              <View style={styles.iconCircle}>
                <LinearGradient
                  colors={['#fc466b', '#3f5efb']}
                  style={styles.iconGradient}
                >
                  <Ionicons name="warning" size={60} color="#FFF" />
                </LinearGradient>
              </View>
            </Animated.View>

            {/* Error Title */}
            <Animated.View
              entering={FadeInUp.duration(600).delay(200)}
              style={styles.titleContainer}
            >
              <Text style={styles.title}>Oops! Something went wrong</Text>
              <Text style={styles.subtitle}>
                We encountered an unexpected error. Don't worry, your data is safe.
              </Text>
            </Animated.View>

            {/* Error Details (Development Mode) */}
            {isDevelopment && error && (
              <Animated.View
                entering={SlideInDown.duration(600).delay(300)}
                style={styles.errorDetails}
              >
                <View style={styles.errorCard}>
                  <View style={styles.errorHeader}>
                    <Ionicons name="bug" size={20} color="#FF6B6B" />
                    <Text style={styles.errorHeaderText}>Error Details</Text>
                  </View>

                  <View style={styles.errorContent}>
                    <Text style={styles.errorLabel}>Error Message:</Text>
                    <Text style={styles.errorMessage}>{error.toString()}</Text>

                    {error.stack && (
                      <>
                        <Text style={[styles.errorLabel, styles.stackLabel]}>
                          Stack Trace:
                        </Text>
                        <ScrollView
                          style={styles.stackScroll}
                          showsVerticalScrollIndicator={true}
                        >
                          <Text style={styles.errorStack}>{error.stack}</Text>
                        </ScrollView>
                      </>
                    )}

                    {errorInfo?.componentStack && (
                      <>
                        <Text style={[styles.errorLabel, styles.stackLabel]}>
                          Component Stack:
                        </Text>
                        <ScrollView
                          style={styles.stackScroll}
                          showsVerticalScrollIndicator={true}
                        >
                          <Text style={styles.errorStack}>
                            {errorInfo.componentStack}
                          </Text>
                        </ScrollView>
                      </>
                    )}
                  </View>
                </View>
              </Animated.View>
            )}

            {/* Action Buttons */}
            <Animated.View
              entering={FadeInUp.duration(600).delay(400)}
              style={styles.actionsContainer}
            >
              <PremiumButton
                title="Try Again"
                onPress={this.handleReset}
                variant="primary"
                size="large"
                icon="refresh"
                iconPosition="left"
                fullWidth
                loading={this.state.isRetrying}
                style={styles.retryButton}
              />

              {isDevelopment && (
                <PremiumButton
                  title="Copy Error Details"
                  onPress={() => {
                    const errorText = `
Error: ${error?.message || 'Unknown error'}

Stack Trace:
${error?.stack || 'No stack trace available'}

Component Stack:
${errorInfo?.componentStack || 'No component stack available'}
                    `.trim();
                    console.log('Error Details:', errorText);
                    // In production, you could use Clipboard.setString(errorText)
                  }}
                  variant="outline"
                  size="medium"
                  icon="copy"
                  iconPosition="left"
                  fullWidth
                  style={styles.copyButton}
                />
              )}
            </Animated.View>

            {/* Help Text */}
            <Animated.View
              entering={FadeIn.duration(600).delay(500)}
              style={styles.helpContainer}
            >
              <Text style={styles.helpText}>
                If this problem persists, please contact support with the error details.
              </Text>
            </Animated.View>
          </ScrollView>
        </LinearGradient>
      </View>
    );
  }

  render(): ReactNode {
    const { hasError } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      // Render custom fallback or default error UI
      return fallback || this.renderErrorUI();
    }

    // Render children normally
    return children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  iconContainer: {
    marginBottom: 32,
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#fc466b',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.6,
        shadowRadius: 20,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  iconGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  errorDetails: {
    width: '100%',
    maxWidth: 500,
    marginBottom: 24,
  },
  errorCard: {
    backgroundColor: '#252525',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333',
    overflow: 'hidden',
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#2A2A2A',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    gap: 8,
  },
  errorHeaderText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  errorContent: {
    padding: 16,
  },
  errorLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B6B',
    marginBottom: 8,
  },
  stackLabel: {
    marginTop: 16,
  },
  errorMessage: {
    fontSize: 14,
    color: '#FFF',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    backgroundColor: '#1A1A1A',
    padding: 12,
    borderRadius: 8,
    lineHeight: 20,
  },
  stackScroll: {
    maxHeight: 150,
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    padding: 12,
  },
  errorStack: {
    fontSize: 12,
    color: '#CCC',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    lineHeight: 18,
  },
  actionsContainer: {
    width: '100%',
    maxWidth: 400,
    gap: 12,
  },
  retryButton: {
    marginBottom: 4,
  },
  copyButton: {
    marginTop: 4,
  },
  helpContainer: {
    marginTop: 32,
    paddingHorizontal: 20,
  },
  helpText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default ErrorBoundary;
