// components/ActiveLimitIndicator.tsx
import React, { useEffect } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  interpolate,
} from "react-native-reanimated";
import Svg, {
  Circle,
  Path,
  Text as SvgText,
  Defs,
  LinearGradient,
  Stop,
} from "react-native-svg";

const { width, height } = Dimensions.get("window");

export type ActiveLimit = "min" | "max" | "zoom" | "fov" | null;

interface ActiveLimitIndicatorProps {
  activeLimit: ActiveLimit;
  intensity: number; // 0-1, how hard the limit is being pushed
  gestureMode: "adjustMax" | "adjustMin" | "symmetric" | "horizontal" | null;
  movingFinger: "top" | "bottom" | "both" | null;
}

export function ActiveLimitIndicator({
  activeLimit,
  intensity,
  gestureMode,
  movingFinger,
}: ActiveLimitIndicatorProps) {
  // Animation values
  const pulseScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);
  const topIndicatorY = useSharedValue(0);
  const bottomIndicatorY = useSharedValue(0);
  const leftIndicatorX = useSharedValue(0);
  const rightIndicatorX = useSharedValue(0);

  useEffect(() => {
    if (!activeLimit) {
      // Fade out all indicators
      glowOpacity.value = withSpring(0);
      pulseScale.value = withSpring(1);
      cancelAnimation(topIndicatorY);
      cancelAnimation(bottomIndicatorY);
      cancelAnimation(leftIndicatorX);
      cancelAnimation(rightIndicatorX);
      topIndicatorY.value = withSpring(0);
      bottomIndicatorY.value = withSpring(0);
      leftIndicatorX.value = withSpring(0);
      rightIndicatorX.value = withSpring(0);
      return;
    }

    // Activate indicator based on limit type
    glowOpacity.value = withSpring(0.6 + intensity * 0.4);

    // Pulse animation for active limit
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 500 }),
        withTiming(1, { duration: 500 }),
      ),
      -1,
      true,
    );

    // Animate indicator position based on gesture mode and moving finger
    if (gestureMode === "adjustMax" && movingFinger === "top") {
      topIndicatorY.value = withSequence(
        withTiming(-20, { duration: 200 }),
        withTiming(0, { duration: 200 }),
      );
    } else if (gestureMode === "adjustMin" && movingFinger === "bottom") {
      bottomIndicatorY.value = withSequence(
        withTiming(20, { duration: 200 }),
        withTiming(0, { duration: 200 }),
      );
    } else if (gestureMode === "horizontal") {
      leftIndicatorX.value = withSequence(
        withTiming(-20, { duration: 200 }),
        withTiming(0, { duration: 200 }),
      );
      rightIndicatorX.value = withSequence(
        withTiming(20, { duration: 200 }),
        withTiming(0, { duration: 200 }),
      );
    }

    return () => {
      cancelAnimation(pulseScale);
    };
  }, [activeLimit, intensity, gestureMode, movingFinger]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const topIndicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: topIndicatorY.value }],
  }));

  const bottomIndicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bottomIndicatorY.value }],
  }));

  const leftIndicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: leftIndicatorX.value }],
  }));

  const rightIndicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: rightIndicatorX.value }],
  }));

  // Get colors for active limit
  const getColors = () => {
    switch (activeLimit) {
      case "min":
        return { primary: "#4CAF50", secondary: "#81C784", text: "NEAR LIMIT" };
      case "max":
        return { primary: "#2196F3", secondary: "#64B5F6", text: "FAR LIMIT" };
      case "zoom":
        return { primary: "#FF9800", secondary: "#FFB74D", text: "ZOOM LIMIT" };
      case "fov":
        return { primary: "#00BCD4", secondary: "#4DD0E1", text: "FOV LIMIT" };
      default:
        return { primary: "#FFFFFF", secondary: "#CCCCCC", text: "" };
    }
  };

  const colors = getColors();

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Global glow overlay */}
      <Animated.View
        style={[
          styles.glowOverlay,
          { backgroundColor: colors.primary },
          glowStyle,
        ]}
      />

      {/* Top indicator (MAX distance) */}
      {activeLimit === "max" && (
        <Animated.View style={[styles.topIndicator, topIndicatorStyle]}>
          <View
            style={[styles.indicatorBadge, { borderColor: colors.primary }]}
          >
            <Svg width={20} height={20} viewBox="0 0 24 24">
              <Path
                d="M12 4L12 20M12 20L8 16M12 20L16 16"
                stroke={colors.primary}
                strokeWidth={2}
                strokeLinecap="round"
              />
            </Svg>
            <Animated.Text
              style={[styles.indicatorText, { color: colors.primary }]}
            >
              MAX DISTANCE
            </Animated.Text>
          </View>
        </Animated.View>
      )}

      {/* Bottom indicator (MIN distance) */}
      {activeLimit === "min" && (
        <Animated.View style={[styles.bottomIndicator, bottomIndicatorStyle]}>
          <View
            style={[styles.indicatorBadge, { borderColor: colors.primary }]}
          >
            <Svg width={20} height={20} viewBox="0 0 24 24">
              <Path
                d="M12 20L12 4M12 4L8 8M12 4L16 8"
                stroke={colors.primary}
                strokeWidth={2}
                strokeLinecap="round"
              />
            </Svg>
            <Animated.Text
              style={[styles.indicatorText, { color: colors.primary }]}
            >
              MIN DISTANCE
            </Animated.Text>
          </View>
        </Animated.View>
      )}

      {/* Left indicator (FOV) */}
      {activeLimit === "fov" && (
        <Animated.View style={[styles.leftIndicator, leftIndicatorStyle]}>
          <View
            style={[styles.indicatorBadge, { borderColor: colors.primary }]}
          >
            <Svg width={20} height={20} viewBox="0 0 24 24">
              <Path
                d="M4 12L20 12M12 4L12 20"
                stroke={colors.primary}
                strokeWidth={2}
                strokeLinecap="round"
              />
              <Circle
                cx={12}
                cy={12}
                r={3}
                stroke={colors.primary}
                strokeWidth={2}
              />
            </Svg>
            <Animated.Text
              style={[styles.indicatorText, { color: colors.primary }]}
            >
              FIELD OF VIEW
            </Animated.Text>
          </View>
        </Animated.View>
      )}

      {/* Right indicator (Zoom) */}
      {activeLimit === "zoom" && (
        <Animated.View style={[styles.rightIndicator, rightIndicatorStyle]}>
          <View
            style={[styles.indicatorBadge, { borderColor: colors.primary }]}
          >
            <Svg width={20} height={20} viewBox="0 0 24 24">
              <Circle
                cx={11}
                cy={11}
                r={8}
                stroke={colors.primary}
                strokeWidth={2}
              />
              <Path
                d="M21 21L17 17"
                stroke={colors.primary}
                strokeWidth={2}
                strokeLinecap="round"
              />
            </Svg>
            <Animated.Text
              style={[styles.indicatorText, { color: colors.primary }]}
            >
              CAMERA ZOOM
            </Animated.Text>
          </View>
        </Animated.View>
      )}

      {/* Pulsing ring around active limit on screen edges */}
      {activeLimit && (
        <Animated.View
          style={[
            styles.pulseRing,
            pulseStyle,
            activeLimit === "min" && styles.pulseRingBottom,
            activeLimit === "max" && styles.pulseRingTop,
            activeLimit === "fov" && styles.pulseRingLeft,
            activeLimit === "zoom" && styles.pulseRingRight,
            { borderColor: colors.primary },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
  },
  glowOverlay: {
    ...StyleSheet.absoluteFill,
    opacity: 0,
  },
  topIndicator: {
    position: "absolute",
    top: 100,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  bottomIndicator: {
    position: "absolute",
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  leftIndicator: {
    position: "absolute",
    left: 20,
    top: "50%",
    transform: [{ translateY: -30 }],
  },
  rightIndicator: {
    position: "absolute",
    right: 20,
    top: "50%",
    transform: [{ translateY: -30 }],
  },
  indicatorBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.8)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    gap: 8,
  },
  indicatorText: {
    fontSize: 14,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  pulseRing: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    opacity: 0.6,
  },
  pulseRingTop: {
    top: 50,
    left: "50%",
    marginLeft: -50,
  },
  pulseRingBottom: {
    bottom: 50,
    left: "50%",
    marginLeft: -50,
  },
  pulseRingLeft: {
    left: 50,
    top: "50%",
    marginTop: -50,
  },
  pulseRingRight: {
    right: 50,
    top: "50%",
    marginTop: -50,
  },
});
