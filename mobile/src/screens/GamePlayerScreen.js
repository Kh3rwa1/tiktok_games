import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { gamesAPI } from '../services/api';

export default function GamePlayerScreen({ route, navigation }) {
  const { game } = route.params;
  const [loading, setLoading] = useState(true);
  const [startTime, setStartTime] = useState(null);
  const webViewRef = useRef(null);

  useEffect(() => {
    setStartTime(Date.now());

    // Record play when component mounts
    recordGamePlay();

    return () => {
      // Calculate play duration when component unmounts
      if (startTime) {
        const duration = Math.floor((Date.now() - startTime) / 1000); // in seconds
        recordPlayDuration(duration);
      }
    };
  }, []);

  const recordGamePlay = async () => {
    try {
      await gamesAPI.recordPlay(game._id, 0);
    } catch (error) {
      console.error('Error recording play:', error);
    }
  };

  const recordPlayDuration = async (duration) => {
    try {
      await gamesAPI.recordPlay(game._id, duration);
    } catch (error) {
      console.error('Error recording play duration:', error);
    }
  };

  const handleClose = () => {
    navigation.goBack();
  };

  const handleReload = () => {
    webViewRef.current?.reload();
  };

  const handleError = (syntheticEvent) => {
    const { nativeEvent } = syntheticEvent;
    console.error('WebView error:', nativeEvent);
    Alert.alert(
      'Error Loading Game',
      'There was an error loading the game. Please try again.',
      [
        { text: 'Retry', onPress: handleReload },
        { text: 'Close', onPress: handleClose },
      ]
    );
  };

  const handleLoadEnd = () => {
    setLoading(false);
  };

  // JavaScript to inject into the WebView for better game experience
  const injectedJavaScript = `
    // Disable text selection for better game UX
    document.body.style.webkitUserSelect = 'none';
    document.body.style.userSelect = 'none';

    // Prevent context menu
    document.addEventListener('contextmenu', function(e) {
      e.preventDefault();
    });

    // Adjust viewport for mobile
    const viewport = document.querySelector('meta[name=viewport]');
    if (!viewport) {
      const meta = document.createElement('meta');
      meta.name = 'viewport';
      meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
      document.getElementsByTagName('head')[0].appendChild(meta);
    }

    true; // Required to return a value
  `;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleClose}
        >
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleReload}
        >
          <Ionicons name="reload" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF0050" />
        </View>
      )}

      <WebView
        ref={webViewRef}
        source={{ uri: game.gameUrl }}
        style={styles.webview}
        onError={handleError}
        onLoadEnd={handleLoadEnd}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        injectedJavaScript={injectedJavaScript}
        scrollEnabled={false}
        bounces={false}
        scalesPageToFit={true}
        startInLoadingState={true}
        // Allow fullscreen for game features
        allowsFullscreenVideo={true}
        // Performance optimizations
        cacheEnabled={true}
        cacheMode="LOAD_CACHE_ELSE_NETWORK"
        // Security
        mixedContentMode="compatibility"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    zIndex: 10,
  },
  headerButton: {
    padding: 8,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    zIndex: 5,
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
});
