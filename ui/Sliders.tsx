// Sliders.tsx - Thermometer Style
import { AR_CONSTANTS } from "@/constants/ar";
import React, { useMemo } from "react";
import { Dimensions, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";

const SCREEN_WIDTH = Dimensions.get("window").width;
const TRACK_WIDTH = SCREEN_WIDTH - 80;
const THUMB_SIZE = 36;
const MIN_GAP = 50;

function clamp(value: number, min: number, max: number) {
  "worklet";
  return Math.min(Math.max(value, min), max);
}

function valueToPosition(value: number, min: number, max: number) {
  "worklet";
  return ((value - min) / (max - min)) * TRACK_WIDTH;
}

function positionToValue(position: number, min: number, max: number) {
  "worklet";
  return Math.round(min + (position / TRACK_WIDTH) * (max - min));
}

type Props = {
  min?: number;
  max?: number;
  initialMin?: number;
  initialMax?: number;
  step?: number;
  onChange?: (values: { minDistance: number; maxDistance: number }) => void;
};

// Thermometer Bulb Component
const ThermometerBulb = ({
  color,
  size = 40,
}: {
  color: string;
  size?: number;
}) => (
  <Svg
    width={size}
    height={size}
    style={{ position: "absolute", bottom: -size + 10 }}
  >
    <Defs>
      <LinearGradient id="bulbGrad" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0%" stopColor={color} stopOpacity={0.8} />
        <Stop offset="100%" stopColor={color} stopOpacity={0.4} />
      </LinearGradient>
    </Defs>
    <Circle cx={size / 2} cy={size / 2} r={size / 2} fill="url(#bulbGrad)" />
    <Circle
      cx={size / 2}
      cy={size / 2}
      r={size / 3}
      fill="rgba(255,255,255,0.15)"
    />
  </Svg>
);

export function FOVSlider({
  min = AR_CONSTANTS.FOV.MIN,
  max = AR_CONSTANTS.FOV.MAX,
  initialValue = AR_CONSTANTS.FOV.DEFAULT,
  step = AR_CONSTANTS.FOV.STEP,
  onChange,
}: {
  min?: number;
  max?: number;
  initialValue?: number;
  step?: number;
  onChange?: (value: number) => void;
}) {
  const thumbY = useSharedValue(valueToPosition(initialValue, min, max));
  const isDragging = useSharedValue(false);

  const emitChange = (pos: number) => {
    const raw = positionToValue(pos, min, max);
    const stepped = Math.round(raw / step) * step;
    onChange?.(stepped);
  };

  const gesture = Gesture.Pan()
    .onBegin(() => {
      isDragging.value = true;
    })
    .onUpdate((event) => {
      const next = clamp(thumbY.value + event.translationY, 0, TRACK_WIDTH);
      thumbY.value = next;
      runOnJS(emitChange)(thumbY.value);
    })
    .onEnd(() => {
      isDragging.value = false;
    });

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: thumbY.value - THUMB_SIZE / 2,
      },
      {
        scale: withSpring(isDragging.value ? 1.1 : 1),
      },
    ],
  }));

  const valueLabelStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: thumbY.value - THUMB_SIZE / 2 - 35,
      },
    ],
    opacity: withTiming(isDragging.value ? 1 : 0, { duration: 150 }),
  }));

  const fillStyle = useAnimatedStyle(() => ({
    height: thumbY.value,
  }));

  const currentValue = useMemo(() => {
    const raw = positionToValue(thumbY.value, min, max);
    return Math.round(raw / step) * step;
  }, [thumbY.value]);

  const percentage = ((currentValue - min) / (max - min)) * 100;

  return (
    <View
      style={{
        position: "absolute",
        left: 24,
        top: "15%",
        height: TRACK_WIDTH,
        alignItems: "center",
        zIndex: 100,
      }}
    >
      {/* Label */}
      <Text
        style={{
          color: "white",
          marginBottom: 16,
          fontWeight: "700",
          fontSize: 11,
          letterSpacing: 1.5,
          textTransform: "uppercase",
          opacity: 0.7,
        }}
      >
        FIELD OF VIEW
      </Text>

      {/* Thermometer Tube */}
      <View
        style={{
          width: 8,
          height: TRACK_WIDTH,
          backgroundColor: "rgba(255,255,255,0.08)",
          borderRadius: 999,
          overflow: "hidden",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 8,
        }}
      >
        {/* Fill */}
        <Animated.View
          style={[
            {
              position: "absolute",
              bottom: 0,
              width: 8,
              backgroundColor: "#FF6B35",
              borderRadius: 999,
            },
            fillStyle,
          ]}
        >
          {/* Glass reflection */}
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 1,
              right: 1,
              height: "30%",
              backgroundColor: "rgba(255,255,255,0.2)",
              borderRadius: 999,
            }}
          />
        </Animated.View>
      </View>

      {/* Value markers */}
      <View
        style={{
          position: "absolute",
          right: 20,
          height: TRACK_WIDTH,
          justifyContent: "space-between",
          paddingVertical: 8,
        }}
      >
        <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 8 }}>
          120°
        </Text>
        <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 8 }}>90°</Text>
        <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 8 }}>60°</Text>
        <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 8 }}>30°</Text>
      </View>

      {/* Thumb / Bulb */}
      <GestureDetector gesture={gesture}>
        <Animated.View
          style={[thumbStyle, { position: "absolute", left: -14 }]}
        >
          <View style={{ alignItems: "center" }}>
            {/* Value tooltip */}
            <Animated.View
              style={[
                {
                  backgroundColor: "rgba(0,0,0,0.85)",
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 16,
                  minWidth: 55,
                  alignItems: "center",
                  marginBottom: 8,
                  borderWidth: 1,
                  borderColor: "#FF6B35",
                },
                valueLabelStyle,
              ]}
            >
              <Text
                style={{
                  color: "#FF6B35",
                  fontSize: 12,
                  fontWeight: "700",
                }}
              >
                {currentValue}°
              </Text>
            </Animated.View>

            {/* Thermometer Bulb */}
            <View
              style={{
                width: THUMB_SIZE,
                height: THUMB_SIZE,
                borderRadius: THUMB_SIZE / 2,
                backgroundColor: "#FF6B35",
                shadowColor: "#FF6B35",
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.5,
                shadowRadius: 12,
                elevation: 8,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <View
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: "rgba(255,255,255,0.25)",
                }}
              />
            </View>
          </View>
        </Animated.View>
      </GestureDetector>

      {/* Percentage indicator */}
      <View
        style={{
          position: "absolute",
          bottom: -30,
          alignItems: "center",
        }}
      >
        <Text
          style={{
            color: "rgba(255,255,255,0.5)",
            fontSize: 9,
          }}
        >
          {Math.round(percentage)}%
        </Text>
      </View>
    </View>
  );
}

export default function DistanceRangeSlider({
  min = AR_CONSTANTS.DISTANCE.MIN,
  max = AR_CONSTANTS.DISTANCE.MAX,
  initialMin = AR_CONSTANTS.DISTANCE.DEFAULT_MIN,
  initialMax = AR_CONSTANTS.DISTANCE.DEFAULT_MAX,
  step = AR_CONSTANTS.DISTANCE.STEP,
  onChange,
}: Props) {
  const minThumbY = useSharedValue(valueToPosition(initialMin, min, max));
  const maxThumbY = useSharedValue(valueToPosition(initialMax, min, max));
  const isDraggingMin = useSharedValue(false);
  const isDraggingMax = useSharedValue(false);

  const emitChange = (minPos: number, maxPos: number) => {
    const rawMin = positionToValue(minPos, min, max);
    const rawMax = positionToValue(maxPos, min, max);

    const steppedMin = Math.round(rawMin / step) * step;
    const steppedMax = Math.round(rawMax / step) * step;

    onChange?.({
      minDistance: steppedMin,
      maxDistance: steppedMax,
    });
  };

  const minGesture = useMemo(() => {
    return Gesture.Pan()
      .onBegin(() => {
        isDraggingMin.value = true;
      })
      .onUpdate((event) => {
        const next = clamp(
          minThumbY.value + event.translationY,
          0,
          maxThumbY.value - MIN_GAP,
        );
        minThumbY.value = next;
        runOnJS(emitChange)(minThumbY.value, maxThumbY.value);
      })
      .onEnd(() => {
        isDraggingMin.value = false;
      });
  }, []);

  const maxGesture = useMemo(() => {
    return Gesture.Pan()
      .onBegin(() => {
        isDraggingMax.value = true;
      })
      .onUpdate((event) => {
        const next = clamp(
          maxThumbY.value + event.translationY,
          minThumbY.value + MIN_GAP,
          TRACK_WIDTH,
        );
        maxThumbY.value = next;
        runOnJS(emitChange)(minThumbY.value, maxThumbY.value);
      })
      .onEnd(() => {
        isDraggingMax.value = false;
      });
  }, []);

  const minThumbStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: minThumbY.value - THUMB_SIZE / 2,
      },
      {
        scale: withSpring(isDraggingMin.value ? 1.1 : 1),
      },
    ],
  }));

  const maxThumbStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: maxThumbY.value - THUMB_SIZE / 2,
      },
      {
        scale: withSpring(isDraggingMax.value ? 1.1 : 1),
      },
    ],
  }));

  const minValueLabelStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: minThumbY.value - THUMB_SIZE / 2 - 35,
      },
    ],
    opacity: withTiming(isDraggingMin.value ? 1 : 0, { duration: 150 }),
  }));

  const maxValueLabelStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: maxThumbY.value - THUMB_SIZE / 2 - 35,
      },
    ],
    opacity: withTiming(isDraggingMax.value ? 1 : 0, { duration: 150 }),
  }));

  const activeFillStyle = useAnimatedStyle(() => ({
    top: minThumbY.value,
    height: maxThumbY.value - minThumbY.value,
  }));

  const currentMinValue = useMemo(() => {
    const raw = positionToValue(minThumbY.value, min, max);
    return Math.round(raw / step) * step;
  }, [minThumbY.value]);

  const currentMaxValue = useMemo(() => {
    const raw = positionToValue(maxThumbY.value, min, max);
    return Math.round(raw / step) * step;
  }, [maxThumbY.value]);

  const formatDistance = (meters: number) => {
    const km = meters / 1000;
    return `${km.toFixed(0)}km`;
  };

  const minPercentage = ((currentMinValue - min) / (max - min)) * 100;
  const maxPercentage = ((currentMaxValue - min) / (max - min)) * 100;

  return (
    <View
      style={{
        position: "absolute",
        right: 24,
        top: "15%",
        height: TRACK_WIDTH,
        alignItems: "center",
        zIndex: 100,
      }}
    >
      {/* Label */}
      <Text
        style={{
          color: "white",
          marginBottom: 16,
          fontWeight: "700",
          fontSize: 11,
          letterSpacing: 1.5,
          textTransform: "uppercase",
          opacity: 0.7,
        }}
      >
        DISTANCE RANGE
      </Text>

      {/* Thermometer Tube */}
      <View
        style={{
          width: 8,
          height: TRACK_WIDTH,
          backgroundColor: "rgba(255,255,255,0.08)",
          borderRadius: 999,
          overflow: "hidden",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 8,
        }}
      >
        {/* Active range fill */}
        <Animated.View
          style={[
            {
              position: "absolute",
              width: 8,
              backgroundColor: "#4CAF50",
              borderRadius: 999,
            },
            activeFillStyle,
          ]}
        >
          {/* Glass reflection */}
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 1,
              right: 1,
              height: "30%",
              backgroundColor: "rgba(255,255,255,0.2)",
              borderRadius: 999,
            }}
          />
        </Animated.View>
      </View>

      {/* Value markers */}
      <View
        style={{
          position: "absolute",
          left: 20,
          height: TRACK_WIDTH,
          justifyContent: "space-between",
          paddingVertical: 8,
        }}
      >
        <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 8 }}>
          130km
        </Text>
        <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 8 }}>
          100km
        </Text>
        <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 8 }}>
          70km
        </Text>
        <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 8 }}>
          40km
        </Text>
        <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 8 }}>
          10km
        </Text>
        <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 8 }}>0km</Text>
      </View>

      {/* Min Thumb (Green) */}
      <GestureDetector gesture={minGesture}>
        <Animated.View
          style={[minThumbStyle, { position: "absolute", left: -14 }]}
        >
          <View style={{ alignItems: "center" }}>
            <Animated.View
              style={[
                {
                  backgroundColor: "rgba(0,0,0,0.85)",
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 12,
                  minWidth: 50,
                  alignItems: "center",
                  marginBottom: 8,
                  borderWidth: 1,
                  borderColor: "#4CAF50",
                },
                minValueLabelStyle,
              ]}
            >
              <Text
                style={{
                  color: "#4CAF50",
                  fontSize: 11,
                  fontWeight: "700",
                }}
              >
                {formatDistance(currentMinValue)}
              </Text>
            </Animated.View>

            <View
              style={{
                width: THUMB_SIZE,
                height: THUMB_SIZE,
                borderRadius: THUMB_SIZE / 2,
                backgroundColor: "#4CAF50",
                shadowColor: "#4CAF50",
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.5,
                shadowRadius: 12,
                elevation: 8,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 2,
                borderColor: "rgba(255,255,255,0.3)",
              }}
            >
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: "rgba(255,255,255,0.3)",
                }}
              />
            </View>
          </View>
        </Animated.View>
      </GestureDetector>

      {/* Max Thumb (Blue) */}
      <GestureDetector gesture={maxGesture}>
        <Animated.View
          style={[maxThumbStyle, { position: "absolute", left: -14 }]}
        >
          <View style={{ alignItems: "center" }}>
            <Animated.View
              style={[
                {
                  backgroundColor: "rgba(0,0,0,0.85)",
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 12,
                  minWidth: 50,
                  alignItems: "center",
                  marginBottom: 8,
                  borderWidth: 1,
                  borderColor: "#2196F3",
                },
                maxValueLabelStyle,
              ]}
            >
              <Text
                style={{
                  color: "#2196F3",
                  fontSize: 11,
                  fontWeight: "700",
                }}
              >
                {formatDistance(currentMaxValue)}
              </Text>
            </Animated.View>

            <View
              style={{
                width: THUMB_SIZE,
                height: THUMB_SIZE,
                borderRadius: THUMB_SIZE / 2,
                backgroundColor: "#2196F3",
                shadowColor: "#2196F3",
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.5,
                shadowRadius: 12,
                elevation: 8,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 2,
                borderColor: "rgba(255,255,255,0.3)",
              }}
            >
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: "rgba(255,255,255,0.3)",
                }}
              />
            </View>
          </View>
        </Animated.View>
      </GestureDetector>

      {/* Range indicator text */}
      <View
        style={{
          position: "absolute",
          bottom: -40,
          alignItems: "center",
        }}
      >
        <Text
          style={{
            color: "rgba(255,255,255,0.5)",
            fontSize: 9,
          }}
        >
          {formatDistance(currentMinValue)} - {formatDistance(currentMaxValue)}
        </Text>
      </View>
    </View>
  );
}
