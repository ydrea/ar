// components/RubberBandVisualFeedback.tsx
import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  cancelAnimation,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import Svg, { Rect, Defs, LinearGradient, Stop } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

interface RubberBandVisualFeedbackProps {
  isActive: boolean;
  limitType: 'min' | 'max' | 'zoom' | null;
  intensity: number; // 0-1, how hard the limit is being hit
}

export function RubberBandVisualFeedback({ 
  isActive, 
  limitType, 
  intensity 
}: RubberBandVisualFeedbackProps) {
  // Animation values
  const stretchLeft = useSharedValue(0);
  const stretchRight = useSharedValue(0);
  const stretchTop = useSharedValue(0);
  const stretchBottom = useSharedValue(0);
  const opacity = useSharedValue(0);
  const shakeX = useSharedValue(0);
  const scale = useSharedValue(1);
  
  useEffect(() => {
    if (!isActive || !limitType) {
      // Fade out and reset
      opacity.value = withSpring(0, { damping: 15 });
      stretchLeft.value = withSpring(0);
      stretchRight.value = withSpring(0);
      stretchTop.value = withSpring(0);
      stretchBottom.value = withSpring(0);
      scale.value = withSpring(1);
      cancelAnimation(shakeX);
      shakeX.value = withSpring(0);
      return;
    }
    
    // Show feedback
    opacity.value = withSpring(0.6 + intensity * 0.4, { damping: 12 });
    
    // Apply stretch based on limit type
    const stretchAmount = 20 + intensity * 80;
    const shakeAmount = 3 + intensity * 7;
    
    switch (limitType) {
      case 'min':
        // Stretch from top
        stretchTop.value = withSpring(stretchAmount, { damping: 8 });
        stretchBottom.value = withSpring(0);
        // Shake horizontally
        shakeX.value = withSequence(
          withTiming(-shakeAmount, { duration: 50 }),
          withTiming(shakeAmount, { duration: 50 }),
          withTiming(-shakeAmount / 2, { duration: 50 }),
          withTiming(shakeAmount / 2, { duration: 50 }),
          withTiming(0, { duration: 100 })
        );
        break;
        
      case 'max':
        // Stretch from bottom
        stretchBottom.value = withSpring(stretchAmount, { damping: 8 });
        stretchTop.value = withSpring(0);
        shakeX.value = withSequence(
          withTiming(-shakeAmount, { duration: 50 }),
          withTiming(shakeAmount, { duration: 50 }),
          withTiming(0, { duration: 100 })
        );
        break;
        
      case 'zoom':
        // Stretch from both sides (zoom limit)
        stretchLeft.value = withSpring(stretchAmount, { damping: 8 });
        stretchRight.value = withSpring(stretchAmount, { damping: 8 });
        // Scale pulse effect
        scale.value = withSequence(
          withTiming(1 + intensity * 0.1, { duration: 100 }),
          withTiming(1, { duration: 200 })
        );
        break;
    }
  }, [isActive, limitType, intensity]);
  
  const topRubberStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -stretchTop.value }],
  }));
  
  const bottomRubberStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: stretchBottom.value }],
  }));
  
  const leftRubberStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -stretchLeft.value }],
  }));
  
  const rightRubberStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: stretchRight.value }],
  }));
  
  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: shakeX.value },
      { scale: scale.value },
    ],
  }));
  
  // Determine colors based on limit type
  const getGradientColors = () => {
    switch (limitType) {
      case 'min':
        return ['rgba(76, 175, 80, 0)', 'rgba(76, 175, 80, 0.8)', 'rgba(76, 175, 80, 0)'];
      case 'max':
        return ['rgba(33, 150, 243, 0)', 'rgba(33, 150, 243, 0.8)', 'rgba(33, 150, 243, 0)'];
      case 'zoom':
        return ['rgba(0, 255, 255, 0)', 'rgba(0, 255, 255, 0.6)', 'rgba(0, 255, 255, 0)'];
      default:
        return ['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 0.5)', 'rgba(255, 255, 255, 0)'];
    }
  };
  
  return (
    <Animated.View style={[styles.container, containerStyle]} pointerEvents="none">
      {/* Top rubber band (min distance limit) */}
      <Animated.View style={[styles.rubberBand, styles.topRubber, topRubberStyle]}>
        <Svg width={width} height={80}>
          <Defs>
            <LinearGradient id="topGradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={getGradientColors()[0]} />
              <Stop offset="50%" stopColor={getGradientColors()[1]} />
              <Stop offset="100%" stopColor={getGradientColors()[2]} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width={width} height={80} fill="url(#topGradient)" />
        </Svg>
        <View style={[styles.stretchLines, styles.topLines]} />
      </Animated.View>
      
      {/* Bottom rubber band (max distance limit) */}
      <Animated.View style={[styles.rubberBand, styles.bottomRubber, bottomRubberStyle]}>
        <Svg width={width} height={80}>
          <Defs>
            <LinearGradient id="bottomGradient" x1="0" y1="1" x2="0" y2="0">
              <Stop offset="0%" stopColor={getGradientColors()[0]} />
              <Stop offset="50%" stopColor={getGradientColors()[1]} />
              <Stop offset="100%" stopColor={getGradientColors()[2]} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width={width} height={80} fill="url(#bottomGradient)" />
        </Svg>
        <View style={[styles.stretchLines, styles.bottomLines]} />
      </Animated.View>
      
      {/* Left rubber band (zoom limit) */}
      <Animated.View style={[styles.rubberBand, styles.leftRubber, leftRubberStyle]}>
        <View style={[styles.stretchLines, styles.leftLines]} />
      </Animated.View>
      
      {/* Right rubber band (zoom limit) */}
      <Animated.View style={[styles.rubberBand, styles.rightRubber, rightRubberStyle]}>
        <View style={[styles.stretchLines, styles.rightLines]} />
      </Animated.View>
      
      {/* Center indicator text */}
      {intensity > 0.5 && (
        <Animated.View style={styles.limitTextContainer}>
          <Animated.Text style={styles.limitText}>
            {limitType === 'min' && 'MIN LIMIT REACHED'}
            {limitType === 'max' && 'MAX LIMIT REACHED'}
            {limitType === 'zoom' && 'ZOOM LIMIT REACHED'}
          </Animated.Text>
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  rubberBand: {
    position: 'absolute',
    overflow: 'hidden',
  },
  topRubber: {
    top: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  bottomRubber: {
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  leftRubber: {
    left: 0,
    top: 0,
    bottom: 0,
    width: 80,
  },
  rightRubber: {
    right: 0,
    top: 0,
    bottom: 0,
    width: 80,
  },
  stretchLines: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  topLines: {
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#4CAF50',
  },
  bottomLines: {
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#2196F3',
  },
  leftLines: {
    left: 0,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#00ffff',
  },
  rightLines: {
    right: 0,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#00ffff',
  },
  limitTextContainer: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    alignItems: 'center',
    marginTop: -20,
  },
  limitText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
    textAlign: 'center',
  },
});