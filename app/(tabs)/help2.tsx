// app/HelpScreen.tsx
import React from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { FadeIn, SlideInRight } from "react-native-reanimated";

const { width, height } = Dimensions.get("window");

interface HelpScreenProps {
  onClose: () => void;
}

// SVG Icons
const HandIcon = ({
  color,
  direction,
  finger,
}: {
  color: string;
  direction?: "up" | "down" | "left" | "right" | "horizontal";
  finger?: "top" | "bottom" | "both";
}) => (
  <Svg width={40} height={40} viewBox="0 0 24 24">
    {direction === "horizontal" ? (
      // Horizontal pinch - FOV control
      <>
        <Path
          d="M3 12L8 7M3 12L8 17"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
        />
        <Path
          d="M21 12L16 7M21 12L16 17"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
        />
        <Circle cx="8" cy="12" r="1.5" fill={color} />
        <Circle cx="16" cy="12" r="1.5" fill={color} />
        {/* FOV arrows */}
        <Path
          d="M12 2L12 6M12 18L12 22"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
        />
        <Path
          d="M2 12L6 12M18 12L22 12"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
        />
      </>
    ) : finger === "top" ? (
      // Top finger - Adjust MAX distance (BOTH ways)
      <>
        <Path
          d="M12 3L12 21"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
        />
        <Path
          d="M7 8L12 3L17 8"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
        />
        <Path
          d="M7 16L12 21L17 16"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          opacity={0.3}
        />
        <Circle cx="12" cy="12" r="1.5" fill={color} />
        {/* Top finger highlight with UP/DOWN arrows */}
        <Circle cx="12" cy="3" r="4" fill={color} opacity={0.2} />
        <Circle cx="12" cy="3" r="2" fill={color} />
        {/* UP arrow */}
        <Path
          d="M9 7L12 4L15 7"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
        />
        {/* DOWN arrow */}
        <Path
          d="M9 10L12 13L15 10"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          opacity={0.5}
        />
        <Text
          style={{
            fontSize: 7,
            fill: "white",
            x: 12,
            y: -4,
            textAnchor: "middle",
          }}
        >
          MAX
        </Text>
      </>
    ) : finger === "bottom" ? (
      // Bottom finger - Adjust MIN distance (BOTH ways)
      <>
        <Path
          d="M12 3L12 21"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
        />
        <Path
          d="M7 16L12 21L17 16"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
        />
        <Path
          d="M7 8L12 3L17 8"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          opacity={0.3}
        />
        <Circle cx="12" cy="12" r="1.5" fill={color} />
        {/* Bottom finger highlight with UP/DOWN arrows */}
        <Circle cx="12" cy="21" r="4" fill={color} opacity={0.2} />
        <Circle cx="12" cy="21" r="2" fill={color} />
        {/* UP arrow */}
        <Path
          d="M9 18L12 15L15 18"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          opacity={0.5}
        />
        {/* DOWN arrow */}
        <Path
          d="M9 21L12 24L15 21"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
        />
        <Text
          style={{
            fontSize: 7,
            fill: "white",
            x: 12,
            y: 27,
            textAnchor: "middle",
          }}
        >
          MIN
        </Text>
      </>
    ) : (
      // Both fingers - Symmetric zoom
      <>
        <Path
          d="M12 3L12 21"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
        />
        <Path
          d="M7 8L12 3L17 8"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
        />
        <Path
          d="M7 16L12 21L17 16"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
        />
        <Circle cx="12" cy="12" r="1.5" fill={color} />
        {/* Zoom arrows */}
        <Path
          d="M12 6L12 9M12 15L12 18"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
        />
        <Path
          d="M9 12L15 12"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          opacity={0.5}
        />
      </>
    )}
  </Svg>
);

// ... (rest of imports and components)

export default function HelpScreen({ onClose }: HelpScreenProps) {
  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <Animated.View entering={FadeIn} style={styles.header}>
          <Text style={styles.title}>🎯 AR Controls</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </Animated.View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentContainer}
        >
          <Text style={styles.subtitle}>
            Two-finger gestures for full control. Each gesture works BOTH ways.
          </Text>

          {/* MAX Distance - Top Finger */}
          <GestureCard
            title="MAX Distance (Top Finger)"
            description={
              "⬆️ Move UP → See further (increase max)\n" +
              "⬇️ Move DOWN → See less far (decrease max)"
            }
            icon={<HandIcon color="#2196F3" finger="top" />}
            color="#2196F3"
            delay={100}
          />

          {/* MIN Distance - Bottom Finger */}
          <GestureCard
            title="MIN Distance (Bottom Finger)"
            description={
              "⬆️ Move UP → Can't see as close (increase min)\n" +
              "⬇️ Move DOWN → Can see closer (decrease min)"
            }
            icon={<HandIcon color="#4CAF50" finger="bottom" />}
            color="#4CAF50"
            delay={200}
          />

          {/* Symmetric Zoom */}
          <GestureCard
            title="Camera Zoom (Both Fingers)"
            description={
              "↕️ Move APART → Zoom IN (closer view)\n" +
              "↕️ Move TOGETHER → Zoom OUT (wider view)"
            }
            icon={<HandIcon color="#FF9800" finger="both" />}
            color="#FF9800"
            delay={300}
          />

          {/* Horizontal FOV */}
          <GestureCard
            title="Field of View (Horizontal Pinch)"
            description={
              "↔️ Spread APART → Wider view (see more)\n" +
              "↔️ Pinch TOGETHER → Narrower view (zoom effect)"
            }
            icon={<HandIcon color="#00BCD4" direction="horizontal" />}
            color="#00BCD4"
            delay={400}
          />

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>📊 Visual Feedback</Text>

          <View style={styles.feedbackGrid}>
            <View style={styles.feedbackItem}>
              <View
                style={[
                  styles.feedbackBadge,
                  {
                    backgroundColor: "rgba(255, 200, 100, 0.2)",
                    borderColor: "#FFC864",
                  },
                ]}
              >
                <Text style={styles.badgeText}>▲</Text>
              </View>
              <Text style={styles.feedbackLabel}>
                Yellow triangle at TOP → POI too far
              </Text>
            </View>

            <View style={styles.feedbackItem}>
              <View
                style={[
                  styles.feedbackBadge,
                  {
                    backgroundColor: "rgba(100, 200, 255, 0.2)",
                    borderColor: "#64C8FF",
                  },
                ]}
              >
                <Text style={styles.badgeText}>▼</Text>
              </View>
              <Text style={styles.feedbackLabel}>
                Blue triangle at BOTTOM → POI too close
              </Text>
            </View>

            <View style={styles.feedbackItem}>
              <View
                style={[
                  styles.feedbackBadge,
                  {
                    backgroundColor: "rgba(255, 255, 255, 0.2)",
                    borderColor: "rgba(255,255,255,0.5)",
                  },
                ]}
              >
                <Text style={styles.badgeText}>◀</Text>
              </View>
              <Text style={styles.feedbackLabel}>
                White triangle on EDGE → Turn this way
              </Text>
            </View>

            <View style={styles.feedbackItem}>
              <View
                style={[
                  styles.feedbackBadge,
                  {
                    backgroundColor: "rgba(0, 255, 255, 0.2)",
                    borderColor: "#00FFFF",
                  },
                ]}
              >
                <Text style={styles.badgeText}>◎</Text>
              </View>
              <Text style={styles.feedbackLabel}>
                Pulsing ring → Rubber band (at limit)
              </Text>
            </View>
          </View>

          <View style={styles.tipBox}>
            <Text style={styles.tipTitle}>💡 Pro Tips</Text>
            <Text style={styles.tipText}>
              • Top finger ⬆️ to see further, ⬇️ to limit your view
            </Text>
            <Text style={styles.tipText}>
              • Bottom finger ⬆️ to ignore close objects, ⬇️ to see them
            </Text>
            <Text style={styles.tipText}>
              • Horizontal pinch to adjust how wide your view is
            </Text>
            <Text style={styles.tipText}>
              • Both fingers to zoom in/out like a camera
            </Text>
            <Text style={styles.tipText}>
              • Tap ↺ to reset everything to defaults
            </Text>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Beta v0.1 — AR Compass</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#00ffff",
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 20,
    color: "white",
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  subtitle: {
    fontSize: 16,
    color: "#cccccc",
    marginBottom: 24,
    lineHeight: 22,
  },
  gestureCard: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  gestureIcon: {
    width: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  gestureContent: {
    flex: 1,
    marginLeft: 12,
  },
  gestureTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  gestureDescription: {
    fontSize: 13,
    color: "#aaaaaa",
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    marginBottom: 16,
  },
  feedbackGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  feedbackItem: {
    flexDirection: "row",
    alignItems: "center",
    width: "48%",
    marginBottom: 12,
  },
  feedbackBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  feedbackLabel: {
    fontSize: 12,
    color: "#cccccc",
    flex: 1,
  },
  tipBox: {
    backgroundColor: "rgba(0, 255, 255, 0.1)",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(0, 255, 255, 0.3)",
    marginBottom: 24,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#00ffff",
    marginBottom: 8,
  },
  tipText: {
    fontSize: 13,
    color: "#cccccc",
    marginBottom: 6,
    lineHeight: 18,
  },
  footer: {
    alignItems: "center",
    paddingTop: 20,
  },
  footerText: {
    fontSize: 11,
    color: "#666666",
    textAlign: "center",
  },
});
