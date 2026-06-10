// hooks/useAnimatedCameraZoom.ts
import { useRef, useCallback } from 'react';
import { CameraView } from 'expo-camera';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withSpring,
  withTiming,
  Easing,
  cancelAnimation,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';

// Animated props for CameraView
const AnimatedCamera = Animated.createAnimatedComponent(CameraView);

interface UseAnimatedCameraZoomProps {
  initialZoom?: number;
  springConfig?: {
    damping?: number;
    mass?: number;
    stiffness?: number;
  };
  onZoomChange?: (zoom: number) => void;
}

export function useAnimatedCameraZoom({
  initialZoom = 0,
  springConfig = { damping: 15, mass: 1, stiffness: 150 },
  onZoomChange,
}: UseAnimatedCameraZoomProps = {}) {
  const cameraRef = useRef<CameraView>(null);
  const animatedZoom = useSharedValue(initialZoom);
  const isAnimating = useSharedValue(false);
  
  // Animated props for smooth camera updates
  const animatedProps = useAnimatedProps(() => {
    return {
      zoom: animatedZoom.value,
    };
  });
  
  // Smooth zoom with spring animation
  const animateZoom = useCallback((
    targetZoom: number,
    type: 'spring' | 'timing' = 'spring',
    duration?: number
  ) => {
    'worklet';
    
    if (isAnimating.value) {
      cancelAnimation(animatedZoom);
    }
    
    isAnimating.value = true;
    
    if (type === 'spring') {
      animatedZoom.value = withSpring(targetZoom, {
        damping: springConfig.damping,
        mass: springConfig.mass,
        stiffness: springConfig.stiffness,
        velocity: 0,
      }, () => {
        isAnimating.value = false;
        if (onZoomChange) {
          runOnJS(onZoomChange)(targetZoom);
        }
      });
    } else {
      animatedZoom.value = withTiming(targetZoom, {
        duration: duration || 300,
        easing: Easing.inOut(Easing.cubic),
      }, () => {
        isAnimating.value = false;
        if (onZoomChange) {
          runOnJS(onZoomChange)(targetZoom);
        }
      });
    }
  }, [animatedZoom, isAnimating, springConfig, onZoomChange]);
  
  // Smooth zoom with gesture delta
  const updateZoomFromGesture = useCallback((delta: number, currentZoom: number) => {
    'worklet';
    
    // Calculate new zoom with momentum
    let newZoom = currentZoom + delta;
    newZoom = Math.max(0, Math.min(1, newZoom));
    
    // Apply with spring for smooth following
    animatedZoom.value = withSpring(newZoom, {
      damping: 20,
      mass: 0.8,
      stiffness: 180,
      velocity: delta * 5, // Add velocity for momentum
    });
    
    return newZoom;
  }, [animatedZoom]);
  
  // Smooth zoom to specific point (e.g., double tap to zoom)
  const zoomToPoint = useCallback((
    targetZoom: number,
    point?: { x: number, y: number }
  ) => {
    'worklet';
    
    // For future implementation: zoom to specific point in frame
    // This would require camera native module support
    animateZoom(targetZoom, 'spring');
  }, [animateZoom]);
  
  // Reset zoom smoothly
  const resetZoom = useCallback(() => {
    animateZoom(0, 'spring');
  }, [animateZoom]);
  
  return {
    cameraRef,
    animatedZoom,
    animatedProps,
    AnimatedCamera,
    animateZoom,
    updateZoomFromGesture,
    zoomToPoint,
    resetZoom,
    isAnimating: isAnimating.value,
  };
}